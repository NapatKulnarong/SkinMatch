from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_userprofile_role"),
    ]

    operations = [
        migrations.CreateModel(
            name="APIClient",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120)),
                ("contact_email", models.EmailField(blank=True, max_length=254)),
                ("key_prefix", models.CharField(db_index=True, max_length=12)),
                ("key_hash", models.CharField(max_length=128, unique=True)),
                (
                    "allowed_ips",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Optional list of IPs or CIDR ranges.",
                    ),
                ),
                (
                    "rate_limit_per_minute",
                    models.PositiveIntegerField(
                        default=120,
                        help_text="Maximum requests per minute for this key. Set to 0 for unlimited.",
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("name",),
            },
        ),
        migrations.AddIndex(
            model_name="apiclient",
            index=models.Index(fields=["key_prefix"], name="core_apic_key_pre_e879ba_idx"),
        ),
        migrations.AddIndex(
            model_name="apiclient",
            index=models.Index(fields=["is_active"], name="core_apic_is_acti_499af3_idx"),
        ),
    ]
