from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0012_force_text_image_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="ingredient",
            name="helps_with",
            field=models.TextField(
                blank=True,
                help_text="Free-form notes describing what this ingredient is known for helping.",
            ),
        ),
        migrations.AddField(
            model_name="ingredient",
            name="avoid_with",
            field=models.TextField(
                blank=True,
                help_text="List ingredients or product types to avoid combining with this ingredient.",
            ),
        ),
        migrations.AddField(
            model_name="ingredient",
            name="side_effects",
            field=models.TextField(
                blank=True,
                help_text="Potential concerns, side effects, or usage notes for this ingredient.",
            ),
        ),
    ]
