import shutil, tempfile
from datetime import timedelta

from django.test import TestCase, override_settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.models import SkinFactTopic, SkinFactContentBlock, SkinFactView

User = get_user_model()

def fake_jpg(name="x.jpg"):
    return SimpleUploadedFile(name, b"\xff\xd8\xff\xd9", content_type="image/jpeg")

@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class SkinFactModelTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.tmp_media = tempfile.mkdtemp(prefix="test_media_")
        cls.override = override_settings(MEDIA_ROOT=cls.tmp_media)
        cls.override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.override.disable()
        shutil.rmtree(cls.tmp_media, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.user = User.objects.create_user(username="u", email="u@example.com", password="x")

    def test_topic_increment_view_count(self):
        topic = SkinFactTopic.objects.create(
            slug="spf50", title="SPF 50 Basics", section=SkinFactTopic.Section.KNOWLEDGE
        )
        topic.increment_view_count()
        topic.refresh_from_db()
        self.assertEqual(topic.view_count, 1)

    def test_topic_increment_multiple_times(self):
        topic = SkinFactTopic.objects.create(
            slug="spf50multi",
            title="SPF 50 Multi Increment",
            section=SkinFactTopic.Section.KNOWLEDGE,
        )
        topic.increment_view_count()
        topic.increment_view_count()
        topic.refresh_from_db()
        self.assertEqual(topic.view_count, 2)

    def test_view_auto_increments_topic(self):
        topic = SkinFactTopic.objects.create(
            slug="vitc", title="Vitamin C", section=SkinFactTopic.Section.FACT_CHECK
        )
        SkinFactView.objects.create(topic=topic, user=self.user)
        topic.refresh_from_db()
        self.assertEqual(topic.view_count, 1)

    def test_content_block_paragraph_requires_text(self):
        topic = SkinFactTopic.objects.create(
            slug="hydration", title="Hydration", section=SkinFactTopic.Section.TRENDING
        )
        blk = SkinFactContentBlock(
            topic=topic,
            content="",
        )
        with self.assertRaises(ValidationError):
            blk.full_clean()

    def test_text_block_with_image_requires_alt_text(self):
        topic = SkinFactTopic.objects.create(
            slug="retinol", title="Retinol 101", section=SkinFactTopic.Section.KNOWLEDGE
        )
        blk = SkinFactContentBlock(
            topic=topic,
            image=fake_jpg("retinol.jpg"),
            image_alt="",
        )
        with self.assertRaises(ValidationError):
            blk.full_clean()

        blk.image_alt = "Illustration of a retinol serum bottle."
        blk.full_clean()
        blk.save()
        self.assertTrue(blk.image.storage.exists(blk.image.name))


class PopularFactsAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="popuser",
            email="pop@example.com",
            password="pass12345",
        )
        self.client.force_login(self.user)

    def _create_topic(self, slug: str, title: str, *, view_count: int = 0, **extra):
        defaults = {
            "slug": slug,
            "title": title,
            "section": SkinFactTopic.Section.KNOWLEDGE,
            "view_count": view_count,
            "is_published": True,
        }
        defaults.update(extra)
        return SkinFactTopic.objects.create(**defaults)

    def test_user_popular_topics_respect_view_history(self):
        base_time = timezone.now()
        topics = []
        for idx in range(6):
            topic = self._create_topic(slug=f"topic-{idx}", title=f"Topic {idx}")
            topics.append(topic)
            # Create idx + 1 views so later topics have higher totals.
            for occurrence in range(idx + 1):
                SkinFactView.objects.create(
                    topic=topic,
                    user=self.user,
                    viewed_at=base_time + timedelta(minutes=occurrence, seconds=idx),
                )

        resp = self.client.get("/api/facts/topics/popular")
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertEqual(len(payload), 5)

        expected_order = [
            topics[5].slug,
            topics[4].slug,
            topics[3].slug,
            topics[2].slug,
            topics[1].slug,
        ]
        self.assertEqual([item["slug"] for item in payload], expected_order)

    def test_popular_topics_fallback_to_global_counts(self):
        base_time = timezone.now()

        user_topics = []
        for idx in range(2):
            topic = self._create_topic(slug=f"user-topic-{idx}", title=f"User Topic {idx}")
            SkinFactView.objects.create(
                topic=topic,
                user=self.user,
                viewed_at=base_time + timedelta(minutes=idx),
            )
            user_topics.append(topic)

        fallback_specs = [
            ("global-1", "Global 1", 80),
            ("global-2", "Global 2", 60),
            ("global-3", "Global 3", 40),
            ("global-4", "Global 4", 20),
        ]
        fallback_topics = [
            self._create_topic(slug, title, view_count=views)
            for slug, title, views in fallback_specs
        ]

        resp = self.client.get("/api/facts/topics/popular")
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertEqual(len(payload), 5)

        # User topics should appear first, ordered by latest view (descending).
        expected_slugs = [
            user_topics[1].slug,
            user_topics[0].slug,
            fallback_topics[0].slug,
            fallback_topics[1].slug,
            fallback_topics[2].slug,
        ]
        self.assertEqual([item["slug"] for item in payload], expected_slugs)
