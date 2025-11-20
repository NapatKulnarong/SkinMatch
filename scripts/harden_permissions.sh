#!/usr/bin/env bash

# Harden file and directory permissions (files 0644, directories 0755) while keeping .env secrets at 600.
# Usage: ./scripts/harden_permissions.sh [/path/to/project/root]

set -euo pipefail

ROOT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

echo "[+] Hardening permissions under ${ROOT_PATH}"

find "${ROOT_PATH}" \
  -path "${ROOT_PATH}/.git" -prune -o \
  -type d -exec chmod 755 {} +

find "${ROOT_PATH}" \
  -path "${ROOT_PATH}/.git" -prune -o \
  -type f -exec chmod 644 {} +

if [ -f "${ROOT_PATH}/.env" ]; then
  chmod 600 "${ROOT_PATH}/.env"
fi

for env_file in "${ROOT_PATH}"/.env.*; do
  if [ -f "${env_file}" ]; then
    chmod 600 "${env_file}"
  fi
done

echo "[+] Permission hardening complete."
