from django.db import migrations, models
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0012_rename_core_newsle_subscri_1d53d1_idx_core_newsle_subscri_8b135b_idx_and_more"),
        ("quiz", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WishlistItem",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="wishlist_items",
                        db_index=True,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="wishlisted_by",
                        db_index=True,
                        to="quiz.product",
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
        migrations.AddConstraint(
            model_name="wishlistitem",
            constraint=models.UniqueConstraint(fields=("user", "product"), name="uniq_user_product_wishlist"),
        ),
        migrations.AddIndex(
            model_name="wishlistitem",
            index=models.Index(fields=("user", "created_at"), name="core_wish_user_created_idx"),
        ),
        migrations.AddIndex(
            model_name="wishlistitem",
            index=models.Index(fields=("product", "created_at"), name="core_wish_prod_created_idx"),
        ),
    ]


