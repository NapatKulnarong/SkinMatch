import json

from django.core import mail
from django.test import TestCase

from django.test import override_settings

from core.models import NewsletterSubscriber, SkinFactTopic


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


@override_settings(SITE_URL="https://skinmatch.test")
class NewsletterSkinFactTopicTests(TestCase):
    def setUp(self):
        self.sub_one = NewsletterSubscriber.objects.create(email="reader1@example.com")
        self.sub_two = NewsletterSubscriber.objects.create(email="reader2@example.com")
        mail.outbox.clear()

    def _create_topic(self, **overrides):
        defaults = {
            "slug": "hydration-101",
            "title": "Hydration 101",
            "subtitle": "Why your barrier loves water",
            "section": SkinFactTopic.Section.KNOWLEDGE,
            "excerpt": "A quick primer on keeping skin hydrated.",
            "is_published": True,
        }
        defaults.update(overrides)
        return SkinFactTopic.objects.create(**defaults)

    def test_sends_email_for_new_topic(self):
        self._create_topic()
        self.assertEqual(len(mail.outbox), 2)
        recipients = {tuple(msg.to)[0] for msg in mail.outbox}
        self.assertSetEqual(recipients, {self.sub_one.email, self.sub_two.email})
        for message in mail.outbox:
            self.assertIn("New Skin Fact: Hydration 101", message.subject)
            self.assertIn("https://skinmatch.test/facts/hydration-101", message.body)
            html_variants = getattr(message, "alternatives", [])
            if html_variants:
                self.assertIn("unsubscribe", html_variants[0][0])

    def test_draft_topic_does_not_send(self):
        self._create_topic(is_published=False)
        self.assertEqual(len(mail.outbox), 0)
