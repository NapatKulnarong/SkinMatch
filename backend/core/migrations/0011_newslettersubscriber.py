from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_alter_skinfactcontentblock_block_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="NewsletterSubscriber",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("source", models.CharField(blank=True, help_text="Where the opt-in originated, e.g. 'homepage', 'quiz_result'.", max_length=80)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("subscribed_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                "ordering": ("-subscribed_at",),
            },
        ),
        migrations.AddIndex(
            model_name="newslettersubscriber",
            index=models.Index(fields=["subscribed_at"], name="core_newsle_subscri_1d53d1_idx"),
        ),
    ]
