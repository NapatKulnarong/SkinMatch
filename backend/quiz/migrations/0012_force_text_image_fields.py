from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0011_matchpick_image_url_text"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE quiz_matchpick ALTER COLUMN image_url TYPE text;",
            reverse_sql="ALTER TABLE quiz_matchpick ALTER COLUMN image_url TYPE varchar(400);",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE quiz_product ALTER COLUMN image TYPE text;",
            reverse_sql="ALTER TABLE quiz_product ALTER COLUMN image TYPE varchar(260);",
        ),
    ]
