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

# Optional in dev: auto-generate migrations
if [ "${DJANGO_AUTO_MAKEMIGRATIONS:-true}" = "true" ]; then
  echo "🧱 Creating migrations (dev)"
  python manage.py makemigrations --noinput || true
else
  echo "🧱 Skipping makemigrations (prod)"
fi

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
u = os.getenv("DJANGO_SUPERUSER_USERNAME")
e = os.getenv("DJANGO_SUPERUSER_EMAIL")
p = os.getenv("DJANGO_SUPERUSER_PASSWORD")

if u and e and p:
    if not User.objects.filter(username=u).exists():
        print("Creating default superuser...")
        User.objects.create_superuser(username=u, email=e, password=p)
    else:
        print("Superuser already exists.")
else:
    print("Superuser credentials not provided; skipping creation.")
PY

echo "🚀 Starting Django dev server..."
exec python manage.py runserver 0.0.0.0:8000