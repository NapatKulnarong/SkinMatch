"""Custom middleware helpers for the core app."""

from __future__ import annotations

import ipaddress
import logging
from typing import Iterable

from django.conf import settings
from django.contrib.auth import logout
from django.http import HttpResponseForbidden, HttpResponseRedirect, JsonResponse
from django.utils import timezone

from .security_events import record_security_event
from .security_utils import bump_counter, get_client_ip


logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware:
    """
    Ensures essential security headers are always present on responses.

    Django's SecurityMiddleware covers most headers already, but this middleware
    lets us inject a configurable Content-Security-Policy and backfill any
    missing headers (e.g., when another upstream overwrites them).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        csp = getattr(settings, "CONTENT_SECURITY_POLICY", "").strip()
        if csp:
            header = (
                "Content-Security-Policy-Report-Only"
                if getattr(settings, "CONTENT_SECURITY_POLICY_REPORT_ONLY", False)
                else "Content-Security-Policy"
            )
            response[header] = csp

        referrer_policy = getattr(settings, "SECURE_REFERRER_POLICY", "").strip()
        if referrer_policy and "Referrer-Policy" not in response:
            response["Referrer-Policy"] = referrer_policy

        if getattr(settings, "SECURE_CONTENT_TYPE_NOSNIFF", False) and (
            "X-Content-Type-Options" not in response
        ):
            response["X-Content-Type-Options"] = "nosniff"

        x_frame_options = getattr(settings, "X_FRAME_OPTIONS", "").strip()
        if x_frame_options and "X-Frame-Options" not in response:
            response["X-Frame-Options"] = x_frame_options

        hsts_seconds = int(getattr(settings, "SECURE_HSTS_SECONDS", 0))
        if hsts_seconds and "Strict-Transport-Security" not in response:
            hsts_value = f"max-age={hsts_seconds}"
            if getattr(settings, "SECURE_HSTS_INCLUDE_SUBDOMAINS", False):
                hsts_value += "; includeSubDomains"
            if getattr(settings, "SECURE_HSTS_PRELOAD", False):
                hsts_value += "; preload"
            response["Strict-Transport-Security"] = hsts_value

        return response


class SessionIdleTimeoutMiddleware:
    """
    Enforces idle session expiration to mitigate hijacked or abandoned sessions.
    """

    SESSION_KEY = "_last_activity_ts"

    def __init__(self, get_response):
        self.get_response = get_response
        self.timeout_seconds = int(getattr(settings, "SESSION_IDLE_TIMEOUT_SECONDS", 0))
        self.exempt_paths = tuple(getattr(settings, "SESSION_IDLE_TIMEOUT_EXEMPT_PATHS", []))
        api_prefixes = getattr(settings, "SESSION_TIMEOUT_API_PREFIXES", ["/api/"])
        self.api_prefixes = tuple(prefix for prefix in api_prefixes if prefix)
        self.redirect_url = getattr(settings, "SESSION_TIMEOUT_REDIRECT_URL", "")
        static_candidates = []
        for attr in ("STATIC_URL", "MEDIA_URL"):
            prefix = getattr(settings, attr, None)
            if prefix:
                static_candidates.append(prefix)
        self.static_prefixes = tuple(static_candidates)

    def __call__(self, request):
        if self._should_enforce(request):
            timeout_response = self._check_expiry(request)
            if timeout_response:
                return timeout_response
            self._touch_session(request)

        response = self.get_response(request)
        return response

    def _should_enforce(self, request) -> bool:
        if self.timeout_seconds <= 0:
            return False
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if not hasattr(request, "session"):
            return False
        path = request.path or ""
        if any(path.startswith(prefix) for prefix in self.static_prefixes):
            return False
        if any(path.startswith(prefix) for prefix in self.exempt_paths):
            return False
        return True

    def _check_expiry(self, request):
        last_activity = request.session.get(self.SESSION_KEY)
        if last_activity is None:
            return None
        try:
            last_activity = float(last_activity)
        except (TypeError, ValueError):
            last_activity = 0.0
        now_ts = timezone.now().timestamp()
        if now_ts - last_activity > self.timeout_seconds:
            return self._handle_timeout(request)
        return None

    def _touch_session(self, request):
        request.session[self.SESSION_KEY] = timezone.now().timestamp()

    def _handle_timeout(self, request):
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            logout(request)
        elif hasattr(request, "session"):
            request.session.flush()
        metadata = {"user_id": getattr(user, "pk", None), "path": request.path, "ip": get_client_ip(request)}
        record_security_event(
            "session.timeout",
            "info",
            f"Idle session cleared for path {request.path}",
            metadata=metadata,
        )
        if self._is_api_request(request.path or ""):
            return JsonResponse({"detail": "Session expired"}, status=401)
        target = self.redirect_url
        if not target:
            target = "/admin/login/?timeout=1" if (request.path or "").startswith("/admin/") else "/login?timeout=1"
        return HttpResponseRedirect(target)

    def _is_api_request(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.api_prefixes)


class AdminAccessControlMiddleware:
    """
    Locks down Django admin (and any configured paths) with RBAC, IP allow lists,
    and optional geographic restrictions.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.path_prefixes = tuple(
            prefix for prefix in getattr(settings, "ADMIN_PROTECTED_PATH_PREFIXES", ["/admin/"]) if prefix
        )
        self.allowed_roles = {
            role.lower()
            for role in getattr(settings, "ADMIN_ALLOWED_ROLES", [])
            if role
        }
        self.allowed_networks = self._build_networks(getattr(settings, "ADMIN_ALLOWED_IPS", []))
        self.country_headers = tuple(
            header for header in getattr(
                settings,
                "ADMIN_COUNTRY_HEADERS",
                ["HTTP_CF_IPCOUNTRY", "HTTP_X_APPENGINE_COUNTRY", "GEOIP_COUNTRY_CODE"],
            )
            if header
        )
        self.trusted_ip_headers = tuple(
            header
            for header in getattr(
                settings,
                "ADMIN_TRUSTED_IP_HEADERS",
                ["HTTP_X_FORWARDED_FOR", "REMOTE_ADDR"],
            )
            if header
        )
        self.allowed_countries = {
            code.upper() for code in getattr(settings, "ADMIN_ALLOWED_COUNTRIES", []) if code
        }

    def __call__(self, request):
        if not self._is_protected_path(request.path or ""):
            return self.get_response(request)

        denial_reason = (
            self._enforce_ip_whitelist(request)
            or self._enforce_country_restriction(request)
            or self._enforce_role_restriction(request)
        )
        if denial_reason:
            return self._reject(request, denial_reason)

        return self.get_response(request)

    def _is_protected_path(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.path_prefixes)

    def _build_networks(
        self, entries: Iterable[str]
    ) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
        networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
        for raw in entries:
            if not raw:
                continue
            try:
                if "/" in raw:
                    network = ipaddress.ip_network(raw, strict=False)
                else:
                    ip_obj = ipaddress.ip_address(raw)
                    mask = 32 if ip_obj.version == 4 else 128
                    network = ipaddress.ip_network(f"{ip_obj}/{mask}", strict=False)
                networks.append(network)
            except ValueError:
                logger.warning("Ignoring invalid admin IP entry: %s", raw)
        return networks

    def _enforce_ip_whitelist(self, request):
        if not self.allowed_networks:
            return None
        client_ip = self._get_client_ip(request)
        if client_ip is None:
            return "Unable to determine client IP for admin request"
        for network in self.allowed_networks:
            if client_ip in network:
                return None
        return f"IP {client_ip} is not allowed to access admin paths"

    def _get_client_ip(self, request):
        for header in self.trusted_ip_headers:
            raw_value = request.META.get(header)
            if not raw_value:
                continue
            candidates = [raw_value]
            if header != "REMOTE_ADDR":
                candidates = [part.strip() for part in raw_value.split(",") if part.strip()]
            for candidate in candidates:
                try:
                    return ipaddress.ip_address(candidate)
                except ValueError:
                    continue
        return None

    def _enforce_country_restriction(self, request):
        if not self.allowed_countries:
            return None
        country = self._get_country_code(request)
        if not country:
            return "Missing country metadata for geo-restricted admin request"
        country = country.upper()
        if country not in self.allowed_countries:
            return f"Country '{country}' is blocked for admin access"
        return None

    def _get_country_code(self, request):
        for header in self.country_headers:
            value = request.META.get(header)
            if value:
                return value.strip()
        return None

    def _enforce_role_restriction(self, request):
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            # Let Django admin handle the login flow.
            return None
        if getattr(user, "is_superuser", False):
            return None
        if not getattr(user, "is_staff", False):
            return "Staff flag required for admin access"
        if not self.allowed_roles:
            return None
        profile = getattr(user, "profile", None)
        role = getattr(profile, "role", None)
        if not role:
            return "User does not have an assigned RBAC role"
        if role.lower() not in self.allowed_roles:
            return f"Role '{role}' is not permitted to access admin"
        return None

    def _reject(self, request, reason: str):
        client_ip = self._get_client_ip(request)
        metadata = {"path": request.path, "ip": str(client_ip) if client_ip else None}
        logger.warning("Admin access blocked: %s", reason)
        record_security_event("admin.access_blocked", "warning", reason, metadata=metadata, force_alert=True)
        return HttpResponseForbidden(reason)


class SecurityMonitoringMiddleware:
    """
    Light-weight IDS style middleware that looks for obvious scanner signatures
    and repeated error responses per IP.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        keywords = getattr(settings, "SECURITY_SUSPICIOUS_PATH_KEYWORDS", [])
        self.keywords = tuple(k.lower() for k in keywords if k)
        codes = getattr(settings, "SECURITY_MONITOR_STATUS_CODES", None) or [401, 403, 404, 405]
        self.status_codes = tuple(codes)
        self.rate_threshold = int(getattr(settings, "SECURITY_MONITOR_RATE_THRESHOLD", 25))
        self.rate_window = int(getattr(settings, "SECURITY_MONITOR_RATE_WINDOW_SECONDS", 300))

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._inspect_request(request, response)
        except Exception:  # pragma: no cover - defensive, don't break responses
            logger.exception("SecurityMonitoringMiddleware failed to inspect request")
        return response

    def _inspect_request(self, request, response):
        path = (request.path or "").lower()
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        ip = get_client_ip(request)
        if path and self.keywords and any(keyword in path for keyword in self.keywords):
            record_security_event(
                "traffic.suspicious_path",
                "warning",
                f"Suspicious path requested: {request.path}",
                metadata={"path": request.path, "ip": ip, "user_agent": user_agent},
            )

        status = getattr(response, "status_code", None)
        if not status or status not in self.status_codes or not ip:
            return
        cache_key = f"security:status:{status}:{ip}"
        count = bump_counter(cache_key, self.rate_window)
        if count >= self.rate_threshold:
            record_security_event(
                "traffic.anomaly",
                "error",
                f"{count} responses with status {status} for {ip}",
                metadata={"ip": ip, "status": status, "path": request.path},
                force_alert=True,
            )
