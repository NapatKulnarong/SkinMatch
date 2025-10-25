#!/bin/bash
set -euo pipefail

cd /app

echo "🏁 Waiting for Postgres using psycopg (DATABASE_URL=$DATABASE_URL)"
python - <<'PY'
import os, time, sys
import psycopg

url = os.environ.get("DATABASE_URL")
for i in range(60):
    try:
        with psycopg.connect(url, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
        print("✅ DB is up")
        sys.exit(0)
    except Exception as e:
        print(f"⏳ DB not ready ({e}); retry {i+1}/60")
        time.sleep(1)
print("❌ DB did not become ready in time")
sys.exit(1)
PY

echo "🔄 Running migrations"
python manage.py migrate --noinput

echo "👤 Ensuring default superuser"
python - <<'PY'
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "apidemo.settings")

import django
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = os.getenv("DJANGO_SUPERUSER_USERNAME")
email = os.getenv("DJANGO_SUPERUSER_EMAIL")
password = os.getenv("DJANGO_SUPERUSER_PASSWORD")

if username and email and password:
    if not User.objects.filter(username=username).exists():
        print("Creating default superuser...")
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
    else:
        print("Superuser already exists.")
else:
    print("Superuser credentials not provided; skipping creation.")
PY

echo "🚀 Starting Django dev server..."
exec python manage.py runserver 0.0.0.0:8000
