from django.test import TestCase
from django.contrib.auth import get_user_model
from allauth.socialaccount.models import SocialAccount, SocialApp
from allauth.account.models import EmailAddress
from django.urls import reverse
from django.contrib.sites.models import Site

class HealthzTest(TestCase):
    def test_healthz_returns_ok(self):
        res = self.client.get("/healthz/")
        self.assertEqual(res.status_code, 200)
        self.assertJSONEqual(res.content, {"status": "ok"})


class EmailAuthTest(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.email = "user@example.com"
        self.password = "secretpass123"
        # Create a user manually (like signup)
        self.user = self.User.objects.create_user(
            username="emailuser", email=self.email, password=self.password
        )
        EmailAddress.objects.create(
            user=self.user, email=self.email, verified=True, primary=True
        )

    def test_login_with_correct_email_and_password(self):
        """Verify login works with valid email and password"""
        login_url = reverse("account_login")  # allauth default route: /accounts/login/
        response = self.client.post(
            login_url, {"login": self.email, "password": self.password}
        )
        # allauth redirects on success (302)
        self.assertEqual(response.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)

    def test_login_fails_with_wrong_password(self):
        """Verify login fails with incorrect password"""
        login_url = reverse("account_login")
        response = self.client.post(
            login_url, {"login": self.email, "password": "wrongpassword"}
        )
        # Returns 200 again (form re-rendered) but no session
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_signup_creates_user_and_emailaddress(self):
        """Verify signup endpoint creates a new user + EmailAddress"""
        signup_url = reverse("account_signup")
        new_email = "new@example.com"
        response = self.client.post(
            signup_url,
            {
                "username": "newuser",
                "email": new_email,
                "password1": "testpass123",
                "password2": "testpass123",
            },
        )
        # allauth redirects after successful signup
        self.assertEqual(response.status_code, 302)
        self.assertTrue(self.User.objects.filter(email=new_email).exists())
        self.assertTrue(EmailAddress.objects.filter(email=new_email).exists())


class GoogleLoginDBTest(TestCase):
    def setUp(self):
        self.User = get_user_model()
        site = Site.objects.create(domain="testserver", name="testserver")
        self.app = SocialApp.objects.create(
            provider="google", name="Google",
            client_id="dummy-client-id", secret="dummy-secret"
        )
        self.app.sites.set([site])

    def test_google_login_creates_user_and_socialaccount(self):
        """
        Simulate the post-Google-callback process:
        Verify that a user and a linked SocialAccount are created correctly.
        """
        # Create a user
        user = self.User.objects.create_user(
            username="googleuser",
            email="test@example.com",
            password=None
        )
        EmailAddress.objects.create(
            user=user, email=user.email, verified=True, primary=True
        )

        # Create a SocialAccount linked to that user
        SocialAccount.objects.create(
            user=user,
            provider="google",
            uid="1234567890",
            extra_data={
                "email": user.email,
                "name": "Test User",
                "picture": "https://example.com/avatar.jpg"
            }
        )

        # Verify both user and social account exist in the database
        self.assertTrue(self.User.objects.filter(email="test@example.com").exists())
        self.assertTrue(
            SocialAccount.objects.filter(provider="google", uid="1234567890").exists()
        )

        # Verify that the social account is correctly linked to the user
        acc = SocialAccount.objects.get(provider="google", uid="1234567890")
        self.assertEqual(acc.user.email, "test@example.com")
