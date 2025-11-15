#!/bin/bash
set -euo pipefail
source .venv/bin/activate
cd backend
DATABASE_URL=sqlite:///test_db.sqlite3 pytest --nomigrations -q core/tests/tests_scan_text.py
