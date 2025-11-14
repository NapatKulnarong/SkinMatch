"""Custom middleware helpers for the core app."""

from django.conf import settings


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
