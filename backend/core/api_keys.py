from __future__ import annotations

import hashlib
from django.utils import timezone

from .models import APIClient
from .security_utils import parse_ip_networks


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def get_api_client_from_key(raw_key: str) -> APIClient | None:
    if not raw_key:
        return None
    digest = _hash_key(raw_key)
    return APIClient.objects.filter(key_hash=digest, is_active=True).first()


def allowed_networks_for(client: APIClient) -> list:
    return parse_ip_networks(client.allowed_ips or [])


def touch_api_client_usage(client: APIClient) -> None:
    APIClient.objects.filter(pk=client.pk).update(last_used_at=timezone.now())
