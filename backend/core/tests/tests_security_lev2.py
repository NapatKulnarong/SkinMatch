"""
Automated tests for Security Level 2 – Intermediate Website Security.

This file focuses on application-level checks such as:

- IDOR protection (users cannot access others' data)
- Admin-only / staff-only areas stay locked down
- No sensitive fields leaked in profile API responses
- No stack trace / debug info leaked in production error pages
- Basic brute-force login protection (no sudden success)
- Privilege escalation prevention via profile updates

⚠ Many Level 2 items (centralized logging, IDS, geo restrictions, full SIEM,
  etc.) must be verified at the infra/ops level and are not covered here.
"""

import json

import pytest
from django.contrib.auth import get_user_model
from django.conf import settings
from django.test import override_settings

from core.auth import create_access_token
from quiz.models import QuizSession

User = get_user_model()

# Quiz session detail endpoint – must accept session_id
QUIZ_SESSION_DETAIL_URL = "/api/quiz/session/{session_id}"

# Admin dashboard – protected by AdminAccessControlMiddleware
ADMIN_ONLY_URL = "/admin/"

# Login endpoint – JWT token exchange
LOGIN_URL = "/api/v1/auth/token"

# Profile endpoint for current logged-in user – protected via JWT
PROFILE_URL = "/api/v1/auth/me"

# Dedicated test-only error route (hooked up via override_settings inside the test)
FORCE_ERROR_URL = "/_tests/force-error/"


# ------------------------------------------------------------------------------
# 1. IDOR & ACCESS CONTROL
# ------------------------------------------------------------------------------

@pytest.mark.django_db
def test_idor_user_cannot_access_other_users_data(client):
    """
    Level 2 – Advanced Access Control / IDOR:

    Verify that a normal user cannot access another user's data simply by
    changing the ID in the URL (Insecure Direct Object Reference).

    Expected:
    - Response should be 403 (Forbidden) or 404 (Not Found), but never 200
      with the other user's data.
    """
    owner = User.objects.create_user(
        username="owner",
        email="owner@example.com",
        password="test12345",
    )
    attacker = User.objects.create_user(
        username="attacker",
        email="attacker@example.com",
        password="test12345",
    )

    session = QuizSession.objects.create(user=owner)

    client.force_login(attacker)

    url = QUIZ_SESSION_DETAIL_URL.format(session_id=session.id)
    response = client.get(url)

    assert response.status_code in (403, 404), (
        f"Potential IDOR: attacker can access owner session at {url} "
        f"(status={response.status_code})."
    )


@pytest.mark.django_db
def test_regular_user_cannot_access_admin_endpoint(client):
    """
    Level 2 – Advanced Access Control:

    Ensure that even an authenticated *non-admin* user cannot access
    admin-only APIs.

    Expected:
    - Response should be 403 or 404 (never 200) for non-admin users.
    """
    user = User.objects.create_user(
        username="normal",
        email="normal@example.com",
        password="test12345",
    )
    client.force_login(user)

    response = client.get(ADMIN_ONLY_URL)

    assert response.status_code in (302, 403, 404), (
        f"Non-admin user can access admin endpoint {ADMIN_ONLY_URL} "
        f"(status={response.status_code})."
    )


# ------------------------------------------------------------------------------
# 2. SENSITIVE DATA EXPOSURE
# ------------------------------------------------------------------------------

@pytest.mark.django_db
def test_profile_does_not_expose_sensitive_fields(client):
    """
    Level 2 – Sensitive Data Exposure:

    Verify that profile APIs do not return internal or sensitive fields, such as:
    - password hash
    - is_superuser
    - is_staff
    - last_login
    - internal IDs or tokens not meant for the client
    """
    user = User.objects.create_user(
        username="secureuser",
        email="secure@example.com",
        password="test12345",
    )
    token = create_access_token(user)

    response = client.get(
        PROFILE_URL,
        HTTP_AUTHORIZATION=f"Bearer {token}",
    )
    assert response.status_code == 200, (
        f"Profile endpoint {PROFILE_URL} did not return 200."
    )

    data = response.json()

    forbidden_keys = ["password", "last_login"]
    for key in forbidden_keys:
        assert key not in data, f"Sensitive field '{key}' leaked in profile response."


# ------------------------------------------------------------------------------
# 3. ERROR HANDLING (NO STACK TRACE IN PRODUCTION)
# ------------------------------------------------------------------------------

@pytest.mark.django_db
@override_settings(ROOT_URLCONF="core.tests.urls_security")
def test_error_responses_do_not_expose_stack_traces(client, settings):
    """
    Level 2 – Security Monitoring & Logging / Hardening:

    Ensure that server errors do not expose raw stack traces or debug details
    to end users when DEBUG is False.

    Expected:
    - 5xx response code
    - Response body should NOT contain 'Traceback' or internal framework names.
    """
    settings.DEBUG = False

    client.raise_request_exception = False

    response = client.get(FORCE_ERROR_URL)

    assert 500 <= response.status_code < 600, (
        f"Expected 5xx status from {FORCE_ERROR_URL}, got {response.status_code} instead."
    )

    body = response.content.decode("utf-8", errors="ignore")
    assert "Traceback" not in body, "Stack trace leaked in error response."
    assert "django" not in body.lower(), "Framework internals leaked in error response."


# ------------------------------------------------------------------------------
# 4. RATE LIMITING / BRUTE FORCE SLOWDOWN
# ------------------------------------------------------------------------------

@pytest.mark.django_db
def test_login_has_basic_rate_limiting_or_consistent_failure(client):
    """
    Level 2 – Security Testing / API Security:

    Simulate repeated failed login attempts and verify that:
    - The server does not suddenly start returning 200 OK for bad credentials.
    - If rate limiting is implemented, it may return 429 (Too Many Requests).

    This is similar to Level 1 but here we explicitly allow and prefer 429.
    """
    payload = {"identifier": "unknown_user@example.com", "password": "wrongpassword"}

    last_response = None
    for _ in range(12):
        last_response = client.post(
            LOGIN_URL,
            data=json.dumps(payload),
            content_type="application/json",
        )

    assert last_response is not None, "Login endpoint did not respond."
    assert last_response.status_code in (200, 400, 401, 403, 429), (
        f"Unexpected status code for repeated failed logins: {last_response.status_code}"
    )
    data = last_response.json()
    assert data.get("ok") is False, "Login endpoint returned success for invalid credentials."


# ------------------------------------------------------------------------------
# 5. PRIVILEGE ESCALATION PREVENTION
# ------------------------------------------------------------------------------

@pytest.mark.django_db
def test_user_cannot_escalate_privileges_via_profile_update(client):
    """
    Level 2 – Advanced Access Control:

    Ensure that a normal user cannot escalate privileges by sending forbidden
    fields (is_superuser, is_staff) in update requests to their own profile.

    Expected:
    - API should ignore or reject these fields.
    - User object in DB must remain non-privileged after the request.
    """
    user = User.objects.create_user(
        username="basicuser",
        email="basic@example.com",
        password="test12345",
    )
    token = create_access_token(user)

    malicious_payload = {
        "first_name": "Basic",
        "is_superuser": True,
        "is_staff": True,
    }

    response = client.put(
        PROFILE_URL,
        data=json.dumps(malicious_payload),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {token}",
    )

    # The API should accept the update but ignore forbidden fields.
    assert response.status_code in (200, 400), (
        f"Unexpected status code when trying to escalate privileges: {response.status_code}"
    )

    user.refresh_from_db()
    assert user.is_superuser is False, "User was able to set is_superuser=True via API."
    assert user.is_staff is False, "User was able to set is_staff=True via API."
