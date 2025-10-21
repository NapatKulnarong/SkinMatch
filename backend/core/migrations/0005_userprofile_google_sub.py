from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_skinprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='google_sub',
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
    ]
