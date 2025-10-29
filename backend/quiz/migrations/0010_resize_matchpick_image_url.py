from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0009_alter_matchpick_image_url"),
    ]

    operations = [
        migrations.AlterField(
            model_name="matchpick",
            name="image_url",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="product",
            name="image",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Optional relative media path or absolute URL for the product image.",
            ),
        ),
    ]
