from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
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

    def test_highlights_return_best_feedback_per_user(self):
        """Users with multiple submissions should only surface their best entry."""

        newer_session = QuizSession.objects.create(user=self.user)

        older_lower = QuizFeedback.objects.create(
            session=self.session,
            rating=3,
            message="It was ok.",
            metadata={},
        )
        # ensure deterministic ordering by timestamp
        older_lower.created_at = timezone.now() - timedelta(days=5)
        older_lower.save(update_fields=["created_at"])

        older_high = QuizFeedback.objects.create(
            session=newer_session,
            rating=5,
            message="Loved it (first try)!",
            metadata={},
        )
        older_high.created_at = timezone.now() - timedelta(days=2)
        older_high.save(update_fields=["created_at"])

        newest_high = QuizFeedback.objects.create(
            session=self.session,
            rating=5,
            message="Loved it (newer)!",
            metadata={},
        )

        other_user = get_user_model().objects.create_user(
            username="feedback-two",
            email="two@example.com",
            password="changeme123",
            first_name="Second",
            last_name="Member",
        )
        other_session = QuizSession.objects.create(user=other_user)
        QuizFeedback.objects.create(
            session=other_session,
            rating=4,
            message="Second user feedback",
            metadata={},
        )

        response = self.client.get("/api/quiz/feedback/highlights", {"limit": 5})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        # should only surface one record for the primary user
        entries_for_user = [
            entry for entry in payload if entry["display_name"] == "Highlight T."
        ]
        self.assertEqual(len(entries_for_user), 1)
        self.assertEqual(entries_for_user[0]["message"], "Loved it (newer)!")

        # ensure we still included the other user
        self.assertTrue(
            any(entry["display_name"] == "Second M." for entry in payload),
            "Other user's feedback should still be present",
        )
