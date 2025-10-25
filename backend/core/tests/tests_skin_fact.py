import shutil, tempfile
from django.test import TestCase, override_settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
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
        blk = SkinFactContentBlock(topic=topic, block_type="paragraph", text="")
        with self.assertRaises(ValidationError):
            blk.full_clean()

    def test_content_block_image_requires_image_file(self):
        topic = SkinFactTopic.objects.create(
            slug="retinol", title="Retinol 101", section=SkinFactTopic.Section.KNOWLEDGE
        )
        blk = SkinFactContentBlock(topic=topic, block_type="image")
        with self.assertRaises(ValidationError):
            blk.full_clean()

        blk.image = fake_jpg("retinol.jpg")
        blk.full_clean()
        blk.save()
        self.assertTrue(blk.image.storage.exists(blk.image.name))
