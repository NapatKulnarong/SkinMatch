# SkinMatch Developer Documentation

This guide explains how to set up a development environment, follow coding standards, and contribute safely to the SkinMatch platform.

## Table of Contents
1. [Audience & Prerequisites](#1-audience--prerequisites)
2. [Repository Layout](#2-repository-layout)
3. [Local Environment Setup](#3-local-environment-setup)
4. [Backend Development Workflow](#4-backend-development-workflow)
5. [Frontend Development Workflow](#5-frontend-development-workflow)
6. [Database, Fixtures & Sample Data](#6-database-fixtures--sample-data)
7. [Testing Strategy](#7-testing-strategy)
8. [Coding Standards & Tooling](#8-coding-standards--tooling)
9. [Secrets & Configuration Management](#9-secrets--configuration-management)
10. [CI/CD & Release Flow](#10-cicd--release-flow)
11. [Debugging & Troubleshooting](#11-debugging--troubleshooting)

---

## 1. Audience & Prerequisites

- Full-stack engineers contributing to the Next.js frontend and Django backend.
- QA engineers running automated suites.
- DevOps/SREs operating Dockerized environments.
- **Prereqs:** Docker Desktop (or Podman), Python 3.11, Node.js 20+, npm 10+, PostgreSQL client tools, Git.

---

## 2. Repository Layout

```
SkinMatch/
├── backend/                # Django project (core + quiz apps, API, OCR helpers)
├── frontend/               # Next.js 15 PWA
├── data/                   # Seed files (skin facts, media exports)
├── docs/                   # Documentation (testing, security, system, user, developer)
├── scripts/                # Utility scripts (permissions, verifiers)
├── docker-compose.yml      # Local orchestration for DB + app stack
└── README.md               # Top-level overview & quick start
```

Key backend modules:

- `backend/core/api.py` — user auth, profile management, newsletters, wishlist.
- `backend/quiz/views.py` — quiz router (questions, answers, results, history, reviews).
- `backend/core/api_scan*.py` — barcode and label analysis services.
- `backend/quiz/management/commands/load_sample_catalog.py` — seeds the catalog for local testing.

---

## 3. Local Environment Setup

### 3.1 One-command Docker stack

```bash
docker-compose up --build
```

Services:

- `backend` — Django app exposed on `http://localhost:8000`.
- `frontend` — Next.js app on `http://localhost:3000`.
- `postgres` — Database on `localhost:5432` (username/password from compose env vars).
- `pgadmin` (optional) — `http://localhost:5050`.

### 3.2 Manual setup (fast feedback)

1. **Python deps**
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Environment**
   - Copy `.env.example` → `.env` (or follow instructions in `README.md`).
   - Ensure `DJANGO_ENV=development`, `DEBUG=True`, local secrets, and `DATABASE_URL` (or default sqlite) are set.
3. **Migrations**
   ```bash
   python manage.py migrate
   python manage.py load_sample --reset  # seeds quiz catalog
   ```
4. **Run server**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
5. **Frontend deps**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
6. **Link frontend → backend**
   - Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`.
   - For login to work on localhost, also set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

---

## 4. Backend Development Workflow

1. **Create feature branch** from `main`.
2. **Add/modify Django apps** within `core` or `quiz`. Keep migrations small and reversible.
3. **API design**
   - Define Pydantic schemas in `core/api.py` or `quiz/schemas.py`.
   - Decorate functions with `@api.get/post/...` or `@router...` and annotate responses.
   - Document new endpoints in `docs/API_DOCUMENTATION.md`.
4. **Business logic**
   - Use services/helpers inside `quiz/recommendations.py`, `core/security_utils.py`, etc.
   - Validate user input via Django validators and `core.sanitizers`.
   - Emit security events via `core.security_events.record_security_event` when needed.
5. **Run tests + linters**
   ```bash
   cd backend
   pytest
   python manage.py test core.tests.test_new_feature  # targeted
   ```
6. **Format**
   - Use `ruff` or `black` (if configured) for formatting; otherwise keep PEP8 style.
   - Keep imports sorted (isort config in `pyproject.toml` if present).
7. **Manual checks**
   - `python manage.py check --deploy` for production-oriented changes.
   - `python manage.py load_sample --reset` to ensure catalog seeding still succeeds.

---

## 5. Frontend Development Workflow

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```
2. **Development server**
   ```bash
   npm run dev
   ```
   The dev server proxies API calls to `NEXT_PUBLIC_API_URL`.
3. **Testing + linting**
   ```bash
   npm run lint
   npm test            # Jest + Testing Library
   npm run test:watch  # during development
   npm run test:e2e    # Playwright (requires running backend)
   npm run typecheck   # TypeScript strict mode
   ```
4. **UI guidelines**
   - Tailwind CSS 4; keep atomic classes sorted logically (layout → spacing → color).
   - Adopt functional, accessible components (ARIA labels, keyboard navigation).
   - Store shared UI primitives in `frontend/src/components/common`.
   - Use `react-query` or SWR conventions for data fetching if introduced. For now, fetch via the existing API service utilities.
5. **State management**
   - Quiz wizard uses context/provider pattern; update the provider to include new answer types.
   - Keep derived state memoized to prevent rerenders.
6. **Internationalization**
   - Strings live in `frontend/src/i18n`; add keys instead of hardcoding text.

---

## 6. Database, Fixtures & Sample Data

- **Seeding:** `python manage.py load_sample --reset` populates questions, choices, products, ingredients, tags, and demo reviews.
- **Custom fixtures:** Place JSON/YAML fixtures under `backend/data/fixtures`. Load via `python manage.py loaddata`.
- **Skin Facts:** Export/import using:
  ```bash
  python manage.py export_skinfact_seed
  python manage.py import_skinfact_seed --reset
  ```
- **Media files:** Stored under `backend/media/`. For PRs, avoid committing new large media; instead provide links or instructions.
- **Database access:** Use `psql` with credentials from `.env` or Compose. For quick inspection:
  ```bash
  docker exec -it skinmatch-postgres-1 psql -U skinmatch -d skinmatch
  ```

---

## 7. Testing Strategy

| Layer | Tools | Notes |
|-------|-------|-------|
| Backend unit/integration | `pytest`, Django test runner | Tests live in `backend/core/tests/` and `backend/quiz/tests/` |
| Frontend unit | Jest + Testing Library | Auto-mocked fetch; see `jest.setup.ts` |
| Frontend E2E | Playwright | Requires backend + database; configure base URL in `playwright.config.ts` |
| API contract | Use pytest with Ninja’s test client or Playwright API fixtures |
| Security | `python manage.py check --deploy`, Bandit, pip-audit (CI) |

Best practices:

- Write regression tests for bug fixes.
- Keep fixtures small; use factories or builders where possible.
- Ensure OCR/AI helpers have deterministic tests by mocking Gemini and OCR outputs.

---

## 8. Coding Standards & Tooling

- **Python**
  - Follow PEP8 + type hints (mypy-ready).
  - Prefer dataclasses/Pydantic models for structured data.
  - Use Django ORM over raw SQL; wrap custom queries in reusable helpers.
- **JavaScript/TypeScript**
  - Enable strict typing; favor `type` aliases over `interface` unless extension is needed.
  - Keep components pure; move side effects into hooks.
- **Git**
  - Conventional commits (e.g., `feat: add wishlist badge`).
  - Small, reviewable PRs (<400 lines when possible).
  - Reference Jira/Trello IDs in commit messages if applicable.
- **Documentation**
  - Update relevant Markdown files when behavior changes.
  - Keep README quick start synced with any setup changes.

---

## 9. Secrets & Configuration Management

- Store secrets outside the repo:
  - Local: `.env` (gitignored).
  - Staging/Prod: Render/Vercel secret managers or AWS Parameter Store.
- Sensitive settings:
  - `DJANGO_SECRET_KEY`, `DATABASE_URL`, `GOOGLE_API_KEY`, `EMAIL_HOST_PASSWORD`, `ADMIN_ALLOWED_IPS`, etc.
- Use `scripts/harden_permissions.sh` to ensure `.env` files have `0600` permissions in production.
- Never commit API keys; GitHub secret scanning is enforced via `gitguardian/ggshield`.

---

## 10. CI/CD & Release Flow

1. **Pull Request**
   - CI runs: backend pytest, frontend lint/test/typecheck, Bandit, pip-audit, npm audit (if configured).
   - Address all failures before requesting review.
2. **Merge to main**
   - Triggers deployment pipeline:
     - Build + push backend Docker image.
     - Deploy backend to Render/target host.
     - Trigger Vercel production deployment.
3. **Post-deploy**
   - Run smoke tests (`/healthz`, `/quiz/questions`, login).
   - Announce release in Slack/email with summary + rollback plan.
4. **Versioning**
   - API version bump requires update to `core/api.py` (`API_VERSION_DEFAULT`) and docs.
   - Frontend uses semantic versioning in `frontend/package.json` for release tagging.

---

## 11. Debugging & Troubleshooting

- **Django shell**
  ```bash
  python manage.py shell_plus  # if django-extensions installed
  ```
- **Inspect API traffic:** Enable Django debug toolbar locally or tail Gunicorn logs (`docker-compose logs -f backend`).
- **Barcode/OCR issues:** Ensure `zbar` and `tesseract` are installed. On macOS: `brew install zbar tesseract`.
- **Google Gemini errors:** Confirm `GOOGLE_API_KEY` is set and quota is available. The backend logs the final exception when retries fail.
- **Database locks:** Use `SELECT * FROM pg_stat_activity` to identify hanging sessions.
- **Cache busting:** Clear Next.js cache with `rm -rf .next` and re-run `npm run dev` if stale assets appear.

---

Need help? Reach the engineering team at dev@skinmatch.com or drop a question in #skinmatch-dev (Slack). Always include reproduction steps, logs, and environment details.
