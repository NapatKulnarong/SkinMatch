from django.db import migrations, models


def bootstrap_roles(apps, schema_editor):
    UserProfile = apps.get_model("core", "UserProfile")
    for profile in UserProfile.objects.select_related("user"):
        user = getattr(profile, "user", None)
        new_role = "member"
        if user and getattr(user, "is_superuser", False):
            new_role = "admin"
        elif user and getattr(user, "is_staff", False):
            new_role = "staff"
        profile.role = new_role
        profile.save(update_fields=["role"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_simplify_content_block_either_or"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="role",
            field=models.CharField(
                choices=[
                    ("admin", "Administrator"),
                    ("staff", "Staff"),
                    ("read_only", "Read-only"),
                    ("member", "Member"),
                ],
                db_index=True,
                default="member",
                help_text="RBAC role used for staff/admin protections.",
                max_length=32,
            ),
        ),
        migrations.RunPython(bootstrap_roles, migrations.RunPython.noop),
    ]
