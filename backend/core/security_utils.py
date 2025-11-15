from __future__ import annotations

from typing import Iterable

from django.conf import settings
from django.core.cache import cache


def get_client_ip(request, header_order: Iterable[str] | None = None) -> str | None:
    headers = list(header_order or getattr(settings, "ADMIN_TRUSTED_IP_HEADERS", ["HTTP_X_FORWARDED_FOR", "REMOTE_ADDR"]))
    for header in headers:
        raw_value = request.META.get(header)
        if not raw_value:
            continue
        if header != "REMOTE_ADDR" and "," in raw_value:
            candidate = raw_value.split(",")[0].strip()
        else:
            candidate = raw_value.strip()
        if candidate:
            return candidate
    return None


def bump_counter(key: str, window_seconds: int) -> int:
    """
    Increment a cache-based counter that automatically expires after window_seconds.
    """
    added = cache.add(key, 1, window_seconds)
    if added:
        return 1
    try:
        return cache.incr(key)
    except Exception:  # pragma: no cover - cache backend without incr
        current = cache.get(key, 0) + 1
        cache.set(key, current, window_seconds)
        return current
