import uuid

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_ensure_default_site"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SkinFactTopic",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("slug", models.SlugField(max_length=140, unique=True)),
                ("title", models.CharField(max_length=180)),
                ("subtitle", models.CharField(blank=True, max_length=220)),
                ("excerpt", models.CharField(blank=True, max_length=240)),
                (
                    "section",
                    models.CharField(
                        choices=[
                            ("knowledge", "Skin Knowledge"),
                            ("trending", "Trending Skincare"),
                            ("fact_check", "Fact Check"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "hero_image",
                    models.ImageField(
                        blank=True,
                        upload_to="facts/hero/",
                        validators=[FileExtensionValidator(["jpg", "jpeg", "png"])],
                    ),
                ),
                ("hero_image_alt", models.CharField(blank=True, max_length=160)),
                ("is_published", models.BooleanField(db_index=True, default=True)),
                ("view_count", models.PositiveIntegerField(db_index=True, default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="SkinFactView",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "anonymous_key",
                    models.CharField(
                        blank=True,
                        help_text="Best-effort identifier for anonymous sessions.",
                        max_length=64,
                    ),
                ),
                (
                    "viewed_at",
                    models.DateTimeField(db_index=True, default=django.utils.timezone.now),
                ),
                (
                    "topic",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="views",
                        to="core.skinfacttopic",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="skin_fact_views",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="SkinFactContentBlock",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("order", models.PositiveIntegerField(default=0)),
                (
                    "block_type",
                    models.CharField(
                        choices=[("paragraph", "Paragraph"), ("image", "Image")],
                        max_length=20,
                    ),
                ),
                ("heading", models.CharField(blank=True, max_length=180)),
                ("text", models.TextField(blank=True)),
                (
                    "image",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="facts/blocks/",
                        validators=[FileExtensionValidator(["jpg", "jpeg", "png"])],
                    ),
                ),
                ("image_alt", models.CharField(blank=True, max_length=160)),
                (
                    "topic",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="content_blocks",
                        to="core.skinfacttopic",
                    ),
                ),
            ],
            options={
                "ordering": ("order",),
            },
        ),
        migrations.AddIndex(
            model_name="skinfacttopic",
            index=models.Index(fields=["section", "is_published"], name="core_skinfac_section_409f40_idx"),
        ),
        migrations.AddIndex(
            model_name="skinfacttopic",
            index=models.Index(fields=["view_count"], name="core_skinfac_view_co_d442c0_idx"),
        ),
        migrations.AddIndex(
            model_name="skinfactview",
            index=models.Index(fields=["user", "viewed_at"], name="core_skinfac_user_vi_6d8154_idx"),
        ),
        migrations.AddIndex(
            model_name="skinfactview",
            index=models.Index(fields=["topic", "viewed_at"], name="core_skinfac_topic_v_7c8b44_idx"),
        ),
    ]
