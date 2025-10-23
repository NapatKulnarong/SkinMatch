#!/usr/bin/env bash
set -euo pipefail

echo "🏁 Waiting for DB via psycopg (DATABASE_URL=$DATABASE_URL)"
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

echo "👤 Ensuring superuser"
python - <<'PY'
import os
# ✅ บอก Django ให้ใช้ settings ของโปรเจกต์
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "apidemo.settings")
import django
django.setup()

from django.contrib.auth import get_user_model

U = get_user_model()
u = os.getenv("DJANGO_SUPERUSER_USERNAME")
e = os.getenv("DJANGO_SUPERUSER_EMAIL")
p = os.getenv("DJANGO_SUPERUSER_PASSWORD")

if u and e and p:
    if not U.objects.filter(username=u).exists():
        U.objects.create_superuser(u, e, p)
        print(f"✅ Superuser created: {u}")
    else:
        print(f"ℹ️  Superuser already exists: {u}")
else:
    print("⚠️  SUPERUSER envs not set; skipping")
PY


echo "🚀 Starting Django"
exec python manage.py runserver 0.0.0.0:8000
