from __future__ import annotations

import logging
from django.conf import settings
from django.contrib.admin.models import LogEntry
from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .security_events import record_security_event
from .security_utils import bump_counter, get_client_ip


logger = logging.getLogger(__name__)


@receiver(user_login_failed)
def capture_failed_login(sender, credentials, request, **kwargs):
    identifier = (credentials.get("username") or credentials.get("email") or "").strip()
    client_ip = get_client_ip(request) if request else None
    metadata = {
        "username": identifier,
        "ip": client_ip,
        "user_agent": request.META.get("HTTP_USER_AGENT", "") if request else "",
    }
    record_security_event(
        "auth.login_failed",
        "warning",
        f"Failed login for identifier '{identifier or 'unknown'}'",
        metadata=metadata,
    )
    threshold = getattr(settings, "SECURITY_FAILED_LOGIN_THRESHOLD", 5)
    window_seconds = getattr(settings, "SECURITY_FAILED_LOGIN_WINDOW_SECONDS", 900)
    if not client_ip:
        return
    cache_key = f"security:login_failed:{client_ip}"
    count = bump_counter(cache_key, window_seconds)
    if count >= threshold:
        record_security_event(
            "auth.bruteforce_detected",
            "error",
            f"{count} failed logins from {client_ip} within {window_seconds}s",
            metadata=metadata,
            force_alert=True,
        )


@receiver(user_logged_in)
def capture_login_success(sender, user, request, **kwargs):
    client_ip = get_client_ip(request) if request else None
    metadata = {
        "user_id": getattr(user, "pk", None),
        "username": getattr(user, "get_username", lambda: None)(),
        "ip": client_ip,
    }
    record_security_event(
        "auth.login_success",
        "info",
        f"User {metadata['username']} logged in",
        metadata=metadata,
    )


@receiver(post_save, sender=LogEntry)
def capture_admin_change(sender, instance: LogEntry, created: bool, **kwargs):
    if not created:
        return
    try:
        username = instance.user.get_username()
    except Exception:  # pragma: no cover - user deleted
        username = None
    metadata = {
        "user_id": instance.user_id,
        "user": username,
        "action_flag": instance.get_change_message(),
        "object_repr": instance.object_repr,
        "content_type_id": instance.content_type_id,
        "object_id": instance.object_id,
        "action_time": timezone.localtime(instance.action_time).isoformat(),
    }
    record_security_event(
        "admin.action",
        "info",
        f"Admin action by {metadata['user'] or metadata['user_id']}: {instance.get_change_message()}",
        metadata=metadata,
    )
