import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0005_rename_quiz_feed_created_idx_quiz_quizfe_created_ca7e51_idx_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductReview",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "rating",
                    models.PositiveSmallIntegerField(
                        blank=True,
                        help_text="Optional 1-5 star rating.",
                        null=True,
                        validators=[MinValueValidator(1), MaxValueValidator(5)],
                    ),
                ),
                ("comment", models.TextField()),
                ("is_public", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reviews",
                        to="quiz.product",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="product_reviews",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
                "unique_together": {("product", "user")},
            },
        ),
        migrations.AddIndex(
            model_name="productreview",
            index=models.Index(fields=["product", "created_at"], name="quiz_produc_product_2fbf41_idx"),
        ),
        migrations.AddIndex(
            model_name="productreview",
            index=models.Index(fields=["user", "created_at"], name="quiz_produc_user_cre_1a6c5a_idx"),
        ),
    ]
