from __future__ import annotations

import ipaddress
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


def parse_ip_networks(entries: Iterable[str]) -> list[ipaddress._BaseNetwork]:
    networks: list[ipaddress._BaseNetwork] = []
    for raw in entries:
        value = (raw or "").strip()
        if not value:
            continue
        try:
            if "/" in value:
                network = ipaddress.ip_network(value, strict=False)
            else:
                ip_obj = ipaddress.ip_address(value)
                mask = 32 if ip_obj.version == 4 else 128
                network = ipaddress.ip_network(f"{ip_obj}/{mask}", strict=False)
            networks.append(network)
        except ValueError:
            continue
    return networks


def ip_in_networks(ip: str | ipaddress._BaseAddress | None, networks: Iterable[ipaddress._BaseNetwork]) -> bool:
    if not ip:
        return False
    try:
        ip_obj = ipaddress.ip_address(ip) if not isinstance(ip, ipaddress._BaseAddress) else ip
    except ValueError:
        return False
    for network in networks:
        if ip_obj in network:
            return True
    return False
