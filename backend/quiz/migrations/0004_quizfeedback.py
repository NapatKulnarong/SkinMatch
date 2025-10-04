import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0003_alter_quizsession_user'),
    ]

    operations = [
        migrations.CreateModel(
            name='QuizFeedback',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('contact_email', models.EmailField(blank=True, max_length=254)),
                ('message', models.TextField()),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedback', to='quiz.quizsession')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['created_at'], name='quiz_feed_created_idx')],
            },
        ),
    ]
