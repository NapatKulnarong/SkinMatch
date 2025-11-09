# pytest + DRF
import json
import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

@pytest.fixture
def api():
    return APIClient()

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="alice", email="alice@example.com", password="Passw0rd!"
    )

def _jwt_for(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)

@pytest.mark.django_db
def test_update_pref_requires_auth_returns_401(api):
    url = reverse("user-prefs-update")  # e.g. path("api/user/prefs/update/", ..., name="user-prefs-update")
    payload = {"marketing_emails": False}
    res = api.post(url, data=json.dumps(payload), content_type="application/json")

    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert "login required" in res.data.get("detail", "").lower()

@pytest.mark.django_db
def test_update_pref_happy_path_with_jwt_updates_and_200(api, user, django_assert_num_queries):
    # Prepare: attach existing prefs if your code requires creation first
    from core.models import UserPreference  # adjust import
    prefs = UserPreference.objects.create(user=user, marketing_emails=True)

    token = _jwt_for(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    url = reverse("user-prefs-update")
    payload = {"marketing_emails": False}

    res = api.post(url, data=json.dumps(payload), content_type="application/json")
    assert res.status_code == status.HTTP_200_OK
    assert "preferences updated" in res.data.get("message", "").lower()

    prefs.refresh_from_db()
    assert prefs.marketing_emails is False
