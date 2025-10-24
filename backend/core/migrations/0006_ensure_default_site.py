from django.db import migrations


def ensure_default_site(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.update_or_create(
        id=1,
        defaults={
            "domain": "localhost",
            "name": "SkinMatch",
        },
    )


class Migration(migrations.Migration):
    dependencies = [
        ("sites", "0001_initial"),
        ("core", "0005_userprofile_google_sub"),
    ]
    operations = [
        migrations.RunPython(ensure_default_site, migrations.RunPython.noop),
    ]
