from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0019_rename_core_apic_key_pre_e879ba_idx_core_apicli_key_pre_a1b527_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="privacy_policy_accepted_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Timestamp when the user accepted the Privacy Policy.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="terms_accepted_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Timestamp when the user accepted the Terms of Service.",
                null=True,
            ),
        ),
    ]
