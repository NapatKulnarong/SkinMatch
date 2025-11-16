import json

from django.core import mail
from django.test import TestCase

from core.models import NewsletterSubscriber


class NewsletterSubscribeTests(TestCase):
    def post_subscribe(self, payload: dict):
        return self.client.post(
            "/api/newsletter/subscribe",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_creates_new_subscriber(self):
        self.assertEqual(len(mail.outbox), 0)
        response = self.post_subscribe({"email": "fresh@example.com", "source": "homepage"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertFalse(data["already_subscribed"])
        subscriber = NewsletterSubscriber.objects.get(email="fresh@example.com")
        self.assertEqual(subscriber.source, "homepage")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Welcome to SkinMatch", mail.outbox[0].subject)
        self.assertIn("fresh@example.com", mail.outbox[0].to)

    def test_duplicate_subscription_returns_already_flag(self):
        NewsletterSubscriber.objects.create(email="member@example.com", source="quiz")
        mail.outbox.clear()
        response = self.post_subscribe({"email": "MEMBER@example.com", "source": "homepage"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertTrue(data["already_subscribed"])
        subscriber = NewsletterSubscriber.objects.get(email="member@example.com")
        # The source should update to latest non-empty value
        self.assertEqual(subscriber.source, "homepage")
        self.assertEqual(len(mail.outbox), 0)

    def test_invalid_email_rejected(self):
        response = self.post_subscribe({"email": "not-an-email", "source": "homepage"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(NewsletterSubscriber.objects.count(), 0)
