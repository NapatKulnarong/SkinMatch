from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from quiz.models import QuizFeedback, QuizSession


class QuizFeedbackAPITests(TestCase):
    """Validate quiz feedback submission and highlight endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="feedback-user",
            email="feedback@example.com",
            password="secret123",
            first_name="Feedback",
            last_name="User",
        )
        self.session = QuizSession.objects.create(user=self.user)

    def test_submit_feedback_accepts_rating_and_message(self):
        payload = {
            "session_id": str(self.session.id),
            "rating": 5,
            "message": "Fantastic recommendations!",
            "metadata": {
                "display_name": "Glow Getter",
                "location": "Bangkok",
            },
        }

        response = self.client.post("/api/quiz/feedback", data=payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

        record = QuizFeedback.objects.get(session=self.session)
        self.assertEqual(record.rating, 5)
        self.assertEqual(record.message, "Fantastic recommendations!")
        self.assertEqual(record.metadata.get("display_name"), "Glow Getter")
        self.assertEqual(record.metadata.get("location"), "Bangkok")

    def test_feedback_rating_bounds_are_enforced(self):
        base_payload = {
            "session_id": str(self.session.id),
            "message": "Edge rating test",
            "metadata": {},
        }

        for invalid in (0, 6):
            payload = {**base_payload, "rating": invalid}
            response = self.client.post("/api/quiz/feedback", data=payload, format="json")
            self.assertEqual(
                response.status_code,
                422,
                f"Expected validation error for rating={invalid}, got {response.status_code}",
            )

        payload = {**base_payload, "rating": 3}
        response = self.client.post("/api/quiz/feedback", data=payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(QuizFeedback.objects.filter(session=self.session, rating=3).exists())

    def test_feedback_highlights_apply_metadata_and_anonymity(self):
        QuizFeedback.objects.create(
            session=self.session,
            rating=5,
            message="  Loved the ingredient insights! ",
            metadata={
                "display_name": "Jane D.",
                "location": "Chiang Mai",
                "badge": "Barrier repaired",
            },
        )
        QuizFeedback.objects.create(
            rating=4,
            message="Great tips.",
            metadata={
                "display_name": "Hidden Hero",
                "anonymous": "1",
                "badge": "Calm skin",
            },
        )

        response = self.client.get("/api/quiz/feedback/highlights", {"limit": 2})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 2)

        anonymous_entry = next(item for item in payload if item["badge"] == "Calm skin")
        self.assertEqual(anonymous_entry["display_name"], "SkinMatch member")
        self.assertEqual(anonymous_entry["initials"], "SM")
        self.assertIsNone(anonymous_entry["location"])
        self.assertEqual(anonymous_entry["message"], "Great tips.")

        named_entry = next(item for item in payload if item["badge"] == "Barrier repaired")
        self.assertEqual(named_entry["display_name"], "Jane D.")
        self.assertEqual(named_entry["initials"], "JD")
        self.assertEqual(named_entry["location"], "Chiang Mai")
        self.assertEqual(named_entry["message"], "Loved the ingredient insights!")
