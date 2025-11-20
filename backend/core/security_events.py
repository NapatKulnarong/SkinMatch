from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.core.mail import send_mail


LOGGER = logging.getLogger("security")

_LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
    "critical": logging.CRITICAL,
}


def _resolve_level(severity: str) -> int:
    return _LEVELS.get(severity.lower(), logging.INFO)


def record_security_event(
    event_type: str,
    severity: str,
    message: str,
    *,
    metadata: dict[str, Any] | None = None,
    force_alert: bool = False,
) -> None:
    """
    Emit a structured log for SOC/SIEM ingestion and optionally trigger alerts.
    """
    metadata = metadata or {}
    level = _resolve_level(severity)
    LOGGER.log(level, message, extra={"event_type": event_type, "severity": severity.upper(), "metadata": metadata})
    _maybe_alert(event_type, severity, message, metadata, level, force_alert=force_alert)


def _maybe_alert(
    event_type: str,
    severity: str,
    message: str,
    metadata: dict[str, Any],
    level: int,
    *,
    force_alert: bool = False,
) -> None:
    recipients = getattr(settings, "SECURITY_ALERT_EMAILS", [])
    if not recipients:
        return
    threshold_name = getattr(settings, "SECURITY_ALERT_MIN_LEVEL", "ERROR").lower()
    threshold = _LEVELS.get(threshold_name, logging.ERROR)
    if not force_alert and level < threshold:
        return
    subject = f"[Security] {event_type} ({severity.upper()})"
    lines = [message, ""]
    if metadata:
        lines.append("Metadata:")
        for key, value in metadata.items():
            lines.append(f"- {key}: {value}")
    body = "\n".join(lines)
    send_mail(subject, body, getattr(settings, "DEFAULT_FROM_EMAIL", None), recipients, fail_silently=True)
