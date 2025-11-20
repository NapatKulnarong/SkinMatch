import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from core.auth import create_access_token, decode_token
from core.models import UserProfile


User = get_user_model()


class AccountAuthAPITests(TestCase):
    signup_url = "/api/auth/signup"
    token_url = "/api/auth/token"
    me_url = "/api/auth/me"

    def _signup_payload(self, **overrides):
        base = {
            "first_name": "Glow",
            "last_name": "Getter",
            "username": overrides.get("username", "glowgetter"),
            "email": overrides.get("email", "glow@example.com"),
            "password": overrides.get("password", "Sup3r!Secure"),
            "confirm_password": overrides.get("confirm_password", "Sup3r!Secure"),
            "date_of_birth": overrides.get("date_of_birth", "1990-04-15"),
            "gender": overrides.get("gender", UserProfile.Gender.FEMALE),
            "accept_terms_of_service": overrides.get("accept_terms_of_service", True),
            "accept_privacy_policy": overrides.get("accept_privacy_policy", True),
        }
        base.update(overrides)
        return base

    def test_signup_success_creates_user_and_profile(self):
        payload = self._signup_payload()
        response = self.client.post(
            self.signup_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True, "message": "Signup successful"})

        user = User.objects.get(username=payload["username"])
        self.assertTrue(user.check_password(payload["password"]))

        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.gender, payload["gender"])
        self.assertIsNotNone(profile.terms_accepted_at)
        self.assertIsNotNone(profile.privacy_policy_accepted_at)
        self.assertEqual(profile.date_of_birth.isoformat(), payload["date_of_birth"])

    def test_signup_rejects_duplicate_emails_case_insensitively(self):
        existing = User.objects.create_user(
            username="existing",
            email="existing@example.com",
            password="DummyPass123!",
        )
        existing.email = "Existing@example.com"
        existing.save(update_fields=["email"])

        payload = self._signup_payload(
            username="another",
            email="existing@example.com".upper(),
        )
        response = self.client.post(
            self.signup_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertIn("Email already in use", data["message"])

    def test_signup_rejects_duplicate_username_case_insensitively(self):
        existing = User.objects.create_user(
            username="GlowUser",
            email="unique@example.com",
            password="DummyPass123!",
        )
        existing.username = "GlowUser"
        existing.save(update_fields=["username"])

        payload = self._signup_payload(username="glowuser", email="another@example.com")
        response = self.client.post(
            self.signup_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertIn("Username already taken", data["message"])

    def test_token_login_with_email_returns_jwt(self):
        password = "Sup3r!Secure"
        user = User.objects.create_user(
            username="tokenuser",
            email="token@example.com",
            password=password,
        )

        response = self.client.post(
            self.token_url,
            data=json.dumps({"identifier": user.email, "password": password}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertTrue(data["token"])

        decoded = decode_token(data["token"])
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["user_id"], user.id)

    def test_token_login_rejects_wrong_password(self):
        user = User.objects.create_user(
            username="wrongpass",
            email="wrongpass@example.com",
            password="CorrectPass123!",
        )

        response = self.client.post(
            self.token_url,
            data=json.dumps({"identifier": user.username, "password": "badpass"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertIn("incorrect", data["message"].lower())

    def test_me_endpoint_requires_valid_bearer_token(self):
        user = User.objects.create_user(
            username="profileuser",
            email="profile@example.com",
            password="StrongPass!234",
            first_name="Profile",
            last_name="User",
        )

        token = create_access_token(user)
        response = self.client.get(
            self.me_url,
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["username"], user.username)
        self.assertEqual(data["email"], user.email)
        self.assertEqual(data["first_name"], user.first_name)
        self.assertIn("u_id", data)

    def test_check_username_available(self):
        """Test that available usernames return available=True"""
        response = self.client.post(
            "/api/auth/check-username",
            data=json.dumps({"username": "newuser123"}),
            content_type="application/json",
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["available"])
        self.assertEqual(data["message"], "Username is available")

    def test_check_username_taken(self):
        """Test that taken usernames return available=False"""
        User.objects.create_user(
            username="takenuser",
            email="taken@example.com",
            password="Pass123!",
        )
        
        response = self.client.post(
            "/api/auth/check-username",
            data=json.dumps({"username": "takenuser"}),
            content_type="application/json",
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["available"])
        self.assertEqual(data["message"], "Username already taken")

    def test_check_username_case_insensitive(self):
        """Test that username check is case-insensitive"""
        User.objects.create_user(
            username="CoolUser",
            email="cool@example.com",
            password="Pass123!",
        )
        
        response = self.client.post(
            "/api/auth/check-username",
            data=json.dumps({"username": "cooluser"}),
            content_type="application/json",
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["available"])
        self.assertEqual(data["message"], "Username already taken")

    def test_check_username_too_short(self):
        """Test that usernames shorter than 3 characters are rejected"""
        response = self.client.post(
            "/api/auth/check-username",
            data=json.dumps({"username": "ab"}),
            content_type="application/json",
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["available"])
        self.assertEqual(data["message"], "Username must be at least 3 characters")

    def test_check_username_empty(self):
        """Test that empty usernames are rejected"""
        response = self.client.post(
            "/api/auth/check-username",
            data=json.dumps({"username": "   "}),
            content_type="application/json",
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["available"])
        self.assertEqual(data["message"], "Username cannot be empty")
