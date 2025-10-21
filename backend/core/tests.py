# backend/core/tests_integration_auth.py

from django.test import TestCase
from django.test.utils import override_settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.contrib.sites.models import Site
from django.conf import settings

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount, SocialApp


class HealthzTest(TestCase):
    """Basic health check endpoint test"""

    def test_healthz_returns_ok(self):
        res = self.client.get("/healthz/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok"})


@override_settings(
    ACCOUNT_EMAIL_VERIFICATION="none",     # Disable email verification for tests
    ACCOUNT_AUTHENTICATION_METHOD="email", # Use email for authentication
    LOGIN_REDIRECT_URL="/",                # Default redirect after login
)
class EmailAuthTest(TestCase):
    """Integration tests for standard email/password authentication"""

    @classmethod
    def setUpTestData(cls):
        # Ensure a Site exists matching settings.SITE_ID (CI sets SITE_ID=2)
        Site.objects.update_or_create(
            id=settings.SITE_ID,
            defaults={"domain": "testserver", "name": "testserver"},
        )

        cls.User = get_user_model()
        cls.email = "user@example.com"
        cls.password = "secretpass123"

        # Create a verified user manually (simulates signup)
        cls.user = cls.User.objects.create_user(
            username="emailuser",
            email=cls.email,
            password=cls.password,
        )
        EmailAddress.objects.create(
            user=cls.user,
            email=cls.email,
            verified=True,
            primary=True,
        )

    def test_login_with_correct_email_and_password(self):
        """User can log in successfully with valid email/password"""
        url = reverse("account_login")
        resp = self.client.post(url, {"login": self.email, "password": self.password})

        # allauth redirects (302) when login succeeds
        self.assertEqual(resp.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)

    def test_login_fails_with_wrong_password(self):
        """Login fails and stays on the same page with invalid password"""
        url = reverse("account_login")
        resp = self.client.post(url, {"login": self.email, "password": "wrong"})

        # Response 200 (form re-rendered), session not created
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_signup_creates_user_and_emailaddress(self):
        """Signup endpoint creates a new user and EmailAddress record"""
        url = reverse("account_signup")
        new_email = "new@example.com"
        payload = {
            "email": new_email,
            "password1": "testpass123",
            "password2": "testpass123",
        }
        # Add username if your project requires it
        if getattr(settings, "ACCOUNT_USERNAME_REQUIRED", True):
            payload["username"] = "newuser"

        resp = self.client.post(url, payload)
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(self.User.objects.filter(email=new_email).exists())
        self.assertTrue(EmailAddress.objects.filter(email=new_email).exists())


@override_settings(
    ACCOUNT_EMAIL_VERIFICATION="none",
    LOGIN_REDIRECT_URL="/",
)
class GoogleLoginDBTest(TestCase):
    """Integration test for simulated Google social login"""

    @classmethod
    def setUpTestData(cls):
        # Ensure a Site exists matching settings.SITE_ID (CI sets SITE_ID=2)
        cls.site, _ = Site.objects.update_or_create(
            id=settings.SITE_ID,
            defaults={"domain": "testserver", "name": "testserver"},
        )

        cls.User = get_user_model()

        # Create a dummy Google SocialApp linked to this Site
        cls.app = SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="dummy-client-id",
            secret="dummy-secret",
        )
        cls.app.sites.set([cls.site])

    def test_google_login_creates_user_and_socialaccount(self):
        """Simulate Google callback: user + linked SocialAccount should exist"""
        user = self.User.objects.create_user(
            username="googleuser",
            email="test@example.com",
            password=None,  # passwordless user for social login
        )
        EmailAddress.objects.create(
            user=user, email=user.email, verified=True, primary=True
        )

        # Create the linked SocialAccount manually
        SocialAccount.objects.create(
            user=user,
            provider="google",
            uid="1234567890",
            extra_data={"email": user.email, "name": "Test User"},
        )

        # Verify user and SocialAccount exist
        self.assertTrue(self.User.objects.filter(email="test@example.com").exists())
        self.assertTrue(
            SocialAccount.objects.filter(provider="google", uid="1234567890").exists()
        )

        # Verify correct linkage between SocialAccount and user
        acc = SocialAccount.objects.get(provider="google", uid="1234567890")
        self.assertEqual(acc.user.email, "test@example.com")
