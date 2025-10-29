from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0008_product_image_and_matchpick_links"),
    ]

    operations = [
        migrations.AlterField(
            model_name="matchpick",
            name="image_url",
            field=models.TextField(blank=True, default=""),
        ),
    ]
