from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0016_rename_quiz_quizfeed_rating_created_idx_quiz_quizfe_rating_ee2040_idx"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="quizfeedback",
            name="contact_email",
        ),
    ]
