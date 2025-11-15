import json

from django.test import TestCase

from core.models import UserProfile


class SignupConsentAPITests(TestCase):
    url = "/api/auth/signup"

    def _payload(self, **overrides):
        base = {
            "first_name": "Test",
            "last_name": "User",
            "username": overrides.get("username", "base"),
            "email": f"{overrides.get('username', 'base')}@example.com",
            "password": "StrongPass!234",
            "confirm_password": "StrongPass!234",
            "date_of_birth": "1995-01-01",
            "gender": "prefer_not",
            "accept_terms_of_service": True,
            "accept_privacy_policy": True,
        }
        base.update(overrides)
        return base

    def test_signup_requires_terms_acceptance(self):
        payload = self._payload(username="no_terms", accept_terms_of_service=False)
        response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertIn("Terms of Service", data["message"])

    def test_signup_requires_privacy_acceptance(self):
        payload = self._payload(username="no_privacy", accept_privacy_policy=False)
        response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertIn("Privacy Policy", data["message"])

    def test_signup_records_consent_timestamps(self):
        payload = self._payload(username="consented")
        response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"], data)

        profile = UserProfile.objects.select_related("user").get(user__username="consented")
        self.assertIsNotNone(profile.terms_accepted_at)
        self.assertIsNotNone(profile.privacy_policy_accepted_at)
