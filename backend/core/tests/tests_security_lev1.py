"""
Automated tests for Security Level 1 – Essential Website Security.

This file focuses on checks that can realistically be automated from the
application layer (Django + pytest), such as:

- Strong authentication (password policy, no default 'admin' user)
- Basic brute-force protection on login
- Security headers on responses
- Optional HTTPS redirect check against a deployed URL

⚠ Items like OS updates, firewall rules, and backup configuration must be
verified manually and are NOT covered here.
"""

import io
import json
import os
import pytest

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.conf import settings

User = get_user_model()

# API route that requires authentication (e.g., wishlist requires JWT)
PROTECTED_URL = "/api/v1/wishlist"

# Login endpoint used by the frontend/backend (JWT token exchange)
LOGIN_URL = "/api/v1/auth/token"

# A simple public endpoint ideal for header checks
PUBLIC_URL = "/healthz/"

PROD_BASE_URL_ENV = "PROD_BASE_URL"

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None


# ------------------------------------------------------------------------------
# 1. STRONG AUTHENTICATION (PASSWORD POLICY, NO DEFAULT ADMIN)
# ------------------------------------------------------------------------------

@pytest.mark.django_db
def test_password_policy_rejects_weak_password():
    """
    Level 1 – Strong Authentication:
    Verify that weak passwords are rejected by Django's password validators.

    This simulates a user trying to set a very weak password like '123456'.
    If your project has properly configured AUTH_PASSWORD_VALIDATORS in settings,
    validate_password() should raise ValidationError for weak values.
    """
    weak_passwords = ["123456", "password", "qwerty", "11111111"]

    for pw in weak_passwords:
        with pytest.raises(ValidationError):
            validate_password(pw)


@pytest.mark.django_db
def test_no_default_admin_username_exists():
    """
    Level 1 – Strong Authentication:
    Ensure there is no active user with the default username 'admin'.

    Default usernames like 'admin' are easy targets for brute-force attacks.
    It's safer to use non-obvious admin usernames.
    """
    exists = User.objects.filter(username__iexact="admin").exists()
    assert exists is False, "A default 'admin' username exists; please rename or remove it."


# ------------------------------------------------------------------------------
# 2. BASIC BRUTE-FORCE PROTECTION ON LOGIN
# ------------------------------------------------------------------------------

@pytest.mark.django_db
def test_bruteforce_login_protection(client):
    """
    Level 1 – Limit Login Attempts:
    Simulate multiple failed login attempts and verify that the application does
    NOT start returning success responses.

    Ideally, your login view should:
    - Return 400/401/403 for invalid credentials
    - Optionally enforce throttling or account/IP lock (429 or similar)

    NOTE:
    - Update LOGIN_URL to match your real login route.
    - Update payload keys (e.g., 'username' / 'email') to match your API.
    """
    payload = {
        "identifier": "ghost-user@example.com",
        "password": "wrong_password",
    }

    last_response = None
    for _ in range(8):  # simulate multiple bad attempts
        last_response = client.post(
            LOGIN_URL,
            data=json.dumps(payload),
            content_type="application/json",
        )

    assert last_response is not None, "Login endpoint did not respond."
    assert last_response.status_code in (200, 400, 401, 403, 429), (
        f"Unexpected status code for repeated failed logins: {last_response.status_code}"
    )
    payload = last_response.json()
    assert payload.get("ok") is False, "Login endpoint returned success for invalid credentials."


@pytest.mark.django_db
def test_protected_endpoint_requires_auth(client):
    """
    Level 1 – Strong Authentication:
    Ensure that a protected endpoint cannot be accessed without being logged in.

    This verifies that authentication is enforced server-side
    (frontend alone is never enough for security).
    """
    response = client.get(PROTECTED_URL)

    # 401 (Unauthorized) or 403 (Forbidden) are both acceptable here
    assert response.status_code in (401, 403), (
        f"Protected endpoint {PROTECTED_URL} is accessible without auth "
        f"(status={response.status_code})."
    )


# ------------------------------------------------------------------------------
# 3. SECURITY HEADERS (THESE ARE MORE L2, BUT VERY IMPORTANT)
# ------------------------------------------------------------------------------

@pytest.mark.django_db
def test_security_headers_on_public_endpoint(client):
    """
    Security Headers (often mapped to Level 2, but critical even at Level 1):

    Verify that standard security headers are present on a public endpoint:

    - X-Frame-Options           → clickjacking protection
    - X-Content-Type-Options    → disable MIME sniffing
    - Referrer-Policy           → limit referrer leakage
    - Content-Security-Policy   → restrict allowed sources
    - Strict-Transport-Security → enforce HTTPS (in production)

    Assumes you've added a custom SecurityHeadersMiddleware.
    """
    response = client.get(PUBLIC_URL)

    # These headers should always exist once middleware is configured
    assert response["X-Frame-Options"] == "DENY"
    assert response["X-Content-Type-Options"] == "nosniff"
    assert response["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "Content-Security-Policy" in response
    assert "default-src 'self'" in response["Content-Security-Policy"]

    # HSTS may only be enabled when using HTTPS (e.g., SECURE_SSL_REDIRECT True)
    if getattr(settings, "SECURE_HSTS_SECONDS", 0) > 0:
        assert "Strict-Transport-Security" in response


# ------------------------------------------------------------------------------
# 4. OPTIONAL – HTTPS REDIRECT & VALID CERT (REQUIRES DEPLOYED URL)
# ------------------------------------------------------------------------------

@pytest.mark.skipif(
    requests is None or not os.getenv(PROD_BASE_URL_ENV),
    reason="Requests library not installed or PROD_BASE_URL not set; skipping HTTPS test.",
)
def test_https_redirect_and_cert_valid():
    """
    Level 1 – HTTPS/SSL Certificate:

    This test is meant to run against a deployed environment, not the local
    Django test server. It checks that:

    - HTTP URL redirects to HTTPS
    - The HTTPS endpoint presents a valid TLS certificate

    Setup:
    - Install 'requests' library in your test environment
    - Export PROD_BASE_URL, e.g.: https://your-domain.com

    NOTE:
    - This will perform a real HTTP/HTTPS request.
    """
    base_url = os.getenv(PROD_BASE_URL_ENV).rstrip("/")
    assert base_url.startswith("https://"), "PROD_BASE_URL must be an HTTPS URL."

    http_url = base_url.replace("https://", "http://", 1)

    # 1) Check redirect from HTTP → HTTPS (no redirects followed)
    resp = requests.get(http_url, allow_redirects=False, timeout=10)

    assert resp.status_code in (301, 302), (
        f"Expected HTTP → HTTPS redirect (301/302), got {resp.status_code} instead."
    )
    location = resp.headers.get("Location", "")
    assert location.startswith("https://"), f"Redirect Location is not HTTPS: {location}"

    # 2) Check that HTTPS endpoint is reachable with a valid certificate
    # 'requests' will raise if the certificate is invalid unless verify=False is set.
    secure_resp = requests.get(base_url, timeout=10)
    assert secure_resp.status_code == 200, (
        f"HTTPS endpoint did not respond with 200 OK, got {secure_resp.status_code}."
    )


# ------------------------------------------------------------------------------
# 5. PLACEHOLDER TESTS FOR MANUAL ITEMS (BACKUP, FIREWALL, UPDATES)
# ------------------------------------------------------------------------------

@pytest.mark.skip(reason="Firewall configuration must be checked manually on the server/hosting provider.")
def test_firewall_and_waf_are_configured():
    """
    Level 1 – Basic Firewall Protection (MANUAL):

    Verify manually that:
    - Only required ports (80/443/SSH) are open from the internet
    - A Web Application Firewall (WAF) is enabled (e.g., Cloudflare, AWS WAF)
    """


@pytest.mark.skip(reason="Backups must be verified via hosting/infra, not via unit tests.")
def test_regular_backups_and_restore():
    """
    Level 1 – Regular Backups (MANUAL):

    Verify manually that:
    - Automatic daily/weekly backups are configured for DB and files
    - Backups are stored off-site (e.g., S3, different region)
    - Restore process has been tested on a staging environment
    """


@pytest.mark.skip(reason="System/OS/Package updates cannot be fully validated from app tests.")
def test_system_and_dependencies_updated():
    """
    Level 1 – Keep Everything Updated (MANUAL):

    Verify manually that:
    - OS and server packages are up to date
    - Application dependencies (npm/pip) have no outstanding security updates
    - CMS or framework versions are recent and supported
    """
