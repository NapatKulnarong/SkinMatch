from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from quiz.models import QuizFeedback, QuizSession


class QuizFeedbackHighlightTests(TestCase):
    """Exercise the feedback highlight endpoint edge cases."""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="highlight-user",
            email="highlight@example.com",
            password="changeme123",
            first_name="Highlight",
            last_name="Tester",
        )
        self.session = QuizSession.objects.create(user=self.user)

    def test_highlights_respect_limit_cap(self):
        for index in range(15):
            QuizFeedback.objects.create(
                rating=4,
                message=f"Helpful tips {index}",
                metadata={"display_name": f"Member {index}"},
            )

        response = self.client.get("/api/quiz/feedback/highlights", {"limit": 20})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 12)

    def test_highlights_fallback_to_user_name_when_metadata_missing(self):
        QuizFeedback.objects.create(
            session=self.session,
            rating=5,
            message="Great experience!",
            metadata={},  # intentionally blank to trigger fallback
        )

        response = self.client.get("/api/quiz/feedback/highlights", {"limit": 1})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)

        entry = payload[0]
        self.assertEqual(entry["display_name"], "Highlight T.")
        self.assertEqual(entry["initials"], "HT")
        self.assertEqual(entry["message"], "Great experience!")
