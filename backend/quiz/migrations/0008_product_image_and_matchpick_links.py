from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0007_rename_quiz_produc_product_2fbf41_idx_quiz_produc_product_791a3e_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="image",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Optional relative media path or absolute URL for the product image.",
            ),
        ),
        migrations.AddField(
            model_name="matchpick",
            name="image_url",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="matchpick",
            name="product_url",
            field=models.URLField(blank=True),
        ),
    ]
