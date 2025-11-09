import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase, override_settings

from core.api import _resolve_media_url, _serialize_fact_block, _serialize_fact_topic_summary
from core.models import SkinFactContentBlock, SkinFactTopic


def _fake_jpg(name: str = "sample.jpg") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, b"\xff\xd8\xff\xd9", content_type="image/jpeg")


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class SkinFactSerializationTests(TestCase):
    """Exercise helper serialization utilities used by the facts UI."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media_root = tempfile.mkdtemp(prefix="facts_media_")
        cls._override = override_settings(MEDIA_ROOT=cls._media_root)
        cls._override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._override.disable()
        shutil.rmtree(cls._media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.factory = RequestFactory()

    def test_resolve_media_url_builds_absolute(self):
        topic = SkinFactTopic.objects.create(
            slug="hydration-basics",
            title="Hydration Basics",
            section=SkinFactTopic.Section.KNOWLEDGE,
            hero_image=_fake_jpg("hydration.jpg"),
        )

        request = self.factory.get("/", HTTP_HOST="backend:8000")
        absolute_url = _resolve_media_url(request, topic.hero_image)

        self.assertIsNotNone(absolute_url)
        self.assertTrue(absolute_url.startswith("http://backend:8000"), absolute_url)
        self.assertIn("/media/facts/hero/", absolute_url or "")
        self.assertTrue(absolute_url.endswith(".jpg"))

    def test_topic_summary_uses_null_when_alt_missing(self):
        topic = SkinFactTopic.objects.create(
            slug="missing-alt",
            title="Missing Alt",
            section=SkinFactTopic.Section.TRENDING,
            hero_image=_fake_jpg("missing_alt.jpg"),
            hero_image_alt="",
        )

        request = self.factory.get("/", HTTP_HOST="backend:8000")
        summary = _serialize_fact_topic_summary(topic, request)

        self.assertTrue(summary.hero_image_url.startswith("http://backend:8000/"))
        self.assertIsNone(summary.hero_image_alt)

    def test_block_serialization_preserves_text_and_image_meta(self):
        topic = SkinFactTopic.objects.create(
            slug="vitamin-c",
            title="Vitamin C Guide",
            section=SkinFactTopic.Section.FACT_CHECK,
        )
        text_block = SkinFactContentBlock.objects.create(
            topic=topic,
            content="Vitamin C helps brighten skin tone.",
            order=1,
        )
        image_block = SkinFactContentBlock.objects.create(
            topic=topic,
            image=_fake_jpg("vitc_block.jpg"),
            image_alt="A bottle of vitamin C serum.",
            order=2,
        )

        request = self.factory.get("/", HTTP_HOST="backend:8000")
        text_payload = _serialize_fact_block(text_block, request)
        image_payload = _serialize_fact_block(image_block, request)

        self.assertEqual(text_payload.order, 1)
        self.assertEqual(text_payload.content, "Vitamin C helps brighten skin tone.")
        self.assertIsNone(text_payload.image_url)

        self.assertEqual(image_payload.image_alt, "A bottle of vitamin C serum.")
        self.assertTrue(image_payload.image_url.startswith("http://backend:8000"))

    def test_anonymous_block_alt_defaults_to_none(self):
        topic = SkinFactTopic.objects.create(
            slug="retinol",
            title="Retinol 101",
            section=SkinFactTopic.Section.KNOWLEDGE,
        )
        block = SkinFactContentBlock.objects.create(
            topic=topic,
            image=_fake_jpg("retinol.jpg"),
            image_alt="",
            order=2,
        )

        request = self.factory.get("/", HTTP_HOST="backend:8000")
        payload = _serialize_fact_block(block, request)

        self.assertIsNone(payload.image_alt)
        self.assertTrue(payload.image_url.endswith(".jpg"))
