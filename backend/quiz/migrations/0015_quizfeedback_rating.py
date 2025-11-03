from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0014_drop_product_image_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="quizfeedback",
            name="rating",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Optional star rating from 1 to 5.",
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(5)],
            ),
        ),
        migrations.AddIndex(
            model_name="quizfeedback",
            index=models.Index(fields=["rating", "created_at"], name="quiz_quizfeed_rating_created_idx"),
        ),
    ]
