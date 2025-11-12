from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class PasswordPolicyValidatorTests(TestCase):
    """Unit tests for Django password validation rules."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="TempPass123!"
        )

    def _assert_validation_error_contains(self, password: str, *substrings: str):
        """Helper: ensure password raises ValidationError containing specific keywords."""
        with self.assertRaises(ValidationError) as cm:
            validate_password(password=password, user=self.user)
        msg = " ".join([str(m).lower() for m in cm.exception.messages])
        self.assertTrue(
            any(s.lower() in msg for s in substrings),
            f"Expected one of {substrings} in message, got: {msg}"
        )

    # --- Basic complexity and length rules ---
    def test_too_short(self):
        self._assert_validation_error_contains("Ab1!", "8", "short")

    def test_missing_uppercase(self):
        self._assert_validation_error_contains("nouppercase1!", "uppercase")

    def test_missing_lowercase(self):
        self._assert_validation_error_contains("NOLOWERCASE1!", "lowercase")

    def test_missing_number(self):
        self._assert_validation_error_contains("NoNumber!!!", "number", "digit")

    def test_missing_special_character(self):
        self._assert_validation_error_contains("NoSpecial123", "special")

    # --- Policy rules beyond basic complexity ---
    def test_too_similar_to_user_attributes(self):
        """Password should be rejected if too similar to username or email."""
        self._assert_validation_error_contains("aliceExample!", "similar")

    def test_common_password(self):
        """Password should be rejected if too common."""
        self._assert_validation_error_contains("password", "common")

    def test_entirely_numeric(self):
        """Password should be rejected if composed of only digits."""
        self._assert_validation_error_contains("12345678", "numeric")

    def test_valid_password_passes_all_rules(self):
        """A strong password that meets all criteria should be accepted."""
        try:
            validate_password("Sup3r!CleanPass", user=self.user)
        except ValidationError as e:
            self.fail(f"Strong password should pass, but raised: {e.messages}")
