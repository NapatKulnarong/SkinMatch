# pytest + DRF
import json

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from core.auth import create_access_token
from core.models import UserProfile

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="alice", email="alice@example.com", password="Passw0rd!"
    )


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(user)
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


@pytest.mark.django_db
def test_update_profile_requires_auth_returns_401(api_client):
    payload = {"first_name": "Updated"}
    res = api_client.put(
        "/api/v1/auth/me",
        data=json.dumps(payload),
        content_type="application/json",
    )

    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    payload = json.loads(res.content or b"{}")
    assert payload.get("detail", "").lower() in {"unauthorized", "authentication credentials were not provided."}


@pytest.mark.django_db
def test_update_profile_happy_path_with_jwt_updates_and_200(api_client, user):
    headers = _auth_headers(user)
    payload = {
        "first_name": "Alice",
        "last_name": "Wonder",
        "username": "alice2",
    }

    res = api_client.put(
        "/api/v1/auth/me",
        data=json.dumps(payload),
        content_type="application/json",
        **headers,
    )
    assert res.status_code == status.HTTP_200_OK
    body = json.loads(res.content or b"{}")
    assert body["first_name"] == "Alice"
    assert body["last_name"] == "Wonder"
    assert body["username"] == "alice2"

    user.refresh_from_db()
    assert user.first_name == "Alice"
    assert user.last_name == "Wonder"
    assert user.username == "alice2"
    profile = UserProfile.objects.get(user=user)
    assert profile.avatar_url == ""
