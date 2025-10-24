#!/bin/bash
set -euo pipefail

echo "Waiting for Postgres at db:5432..."
until python - <<'PYCODE'
import socket
host, port = "db", 5432
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    try:
        sock.settimeout(2)
        sock.connect((host, port))
    except OSError:
        raise SystemExit(1)
PYCODE
do
  sleep 1
done
echo "Database is reachable."

echo "Database available. Running migrations..."
python manage.py migrate --noinput

echo "Ensuring default superuser exists..."
python - <<'PYCODE'
import os
from django.contrib.auth import get_user_model

username = os.getenv("DJANGO_SUPERUSER_USERNAME")
email = os.getenv("DJANGO_SUPERUSER_EMAIL")
password = os.getenv("DJANGO_SUPERUSER_PASSWORD")

if username and email and password:
    User = get_user_model()
    if not User.objects.filter(username=username).exists():
        print("Creating default superuser...")
        User.objects.create_superuser(username=username, email=email, password=password)
    else:
        print("Superuser already exists.")
else:
    print("Superuser credentials not provided; skipping creation.")
PYCODE

echo "Starting Django dev server..."
exec python manage.py runserver 0.0.0.0:8000
