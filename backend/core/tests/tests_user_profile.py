from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from core.models import UserProfile, SkinProfile

User = get_user_model()

class UserProfileModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="alice", email="alice@example.com",
            password="12345", first_name="Alice", last_name="Wong"
        )

    def test_full_name_and_str(self):
        prof, _ = UserProfile.objects.get_or_create(user=self.user)
        self.assertEqual(prof.full_name, "Alice Wong")
        self.assertIn("Profile of", str(prof))

    def test_age_property(self):
        dob = date.today().replace(year=date.today().year - 20) + timedelta(days=1)
        prof, _ = UserProfile.objects.get_or_create(user=self.user)
        prof.date_of_birth = dob
        prof.save()
        self.assertEqual(prof.age, 19)

class SkinProfileModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="bob", email="bob@example.com", password="12345"
        )

    def test_str_contains_user_and_primary_concern(self):
        sp = SkinProfile.objects.create(
            user=self.user,
            primary_concerns=["acne", "dark_spots"],
            skin_type=SkinProfile.SkinType.OILY,
            sensitivity=SkinProfile.Sensitivity.SOMETIMES,
            budget=SkinProfile.Budget.AFFORDABLE,
        )
        s = str(sp)
        self.assertIn("acne", s)
        self.assertIn("bob", s)
