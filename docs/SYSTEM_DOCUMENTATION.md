# SkinMatch System Documentation

This document provides architects, product owners, and operations engineers with a holistic view of the SkinMatch platform—its purpose, boundaries, major components, and operational controls.

## Table of Contents
1. [Introduction](#1-introduction)
   - [1.1 Project Overview](#11-project-overview)
   - [1.2 Objectives](#12-objectives)
   - [1.3 Scope of the System](#13-scope-of-the-system)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend Services (Django + Ninja API)](#3-backend-services-django--ninja-api)
4. [Frontend Experience (Next.js)](#4-frontend-experience-nextjs)
5. [Data Management](#5-data-management)
6. [External Integrations](#6-external-integrations)
7. [Deployment Topology](#7-deployment-topology)
8. [Operational Monitoring & Logging](#8-operational-monitoring--logging)
9. [Security Alignment](#9-security-alignment)
10. [Configuration Matrix](#10-configuration-matrix)

---

## 1. Introduction

### 1.1 Project Overview

SkinMatch is a personalized skincare recommendation platform that blends rule-based logic, curated catalog data, and AI-assisted label parsing to help consumers discover safe, effective routines. The product surface includes:

- A React/Next.js single-page app that collects user data, renders quiz flows, and visualizes routines.
- A Django backend exposing REST APIs via Ninja, persisting domain data in PostgreSQL, and orchestrating background tasks like newsletter enrollment or barcode scanning.
- Ingredient intelligence services powered by OCR and Google Gemini that convert noisy product labels into structured insights.

### 1.2 Objectives

1. **Personalization:** Deliver accurate, explainable skincare recommendations tailored to skin type, concerns, sensitivities, and budget.
2. **Transparency:** Expose ingredient-level benefits, risks, and usage notes so users understand why a product is recommended or flagged.
3. **Trust & Safety:** Enforce strong authentication, audit trails, and admin controls to protect sensitive skin data.
4. **Scalability:** Keep onboarding friction low for both anonymous visitors and logged-in users while supporting future mobile or partner integrations.
5. **Operational Excellence:** Provide actionable monitoring, backup, and recovery procedures so the service remains available and compliant.

### 1.3 Scope of the System

In scope:

- Web experience (dashboard, quiz, routines, education hub)
- Public and authenticated APIs under `/api/v1/**`
- Batch/management commands for catalog seeding and exports
- OCR + AI-powered ingredient analysis
- Infrastructure defined by Docker Compose and the Render/Vercel deployment flows

Out of scope:

- Third-party affiliate storefronts (only linked via `product_url`)
- Native mobile apps (future consideration)
- Fulfillment, payment processing, or logistics tooling

---

## 2. High-Level Architecture

```
                ┌──────────────────────────┐
                │ Next.js Frontend (PWA)   │
                └──────────────┬───────────┘
                               │ HTTPS (JWT + optional API key)
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│ Django + Ninja API (backend/)                                     │
│   - core.api (auth, profiles, wishlist, newsletters, AI helper)   │
│   - quiz.router (questions, answers, history, products, reviews)  │
│   - core.api_scan(_text) (barcode & OCR)                          │
└───────────────┬───────────────────────────┬───────────────────────┘
                │                           │
                ▼                           ▼
      PostgreSQL (docker-compose)      External Services (Gemini, email,
      - Users/UserProfile              Google OAuth, newsletter ESP)
      - QuizSession/Product            |
      - Ingredient taxonomy            ▼
                               Media storage (S3/local volume)
```

- The API server is stateless; scaling horizontally involves adding processes behind a load balancer.
- Static assets (Next.js build) are served by Vercel; authenticated API calls always hit the Django service.

---

## 3. Backend Services (Django + Ninja API)

- **Code location:** `backend/`
- **Entry point:** `manage.py` loads `apidemo.settings`.
- **Apps:**
  - `core`: authentication, profiles, newsletters, wishlist, security middleware, OCR helpers.
  - `quiz`: domain logic for quiz sessions, catalog, recommendations, feedback, reviews.
- **API exposure:** `core/api.py` instantiates `NinjaAPI` with versioned routing and mounts `quiz_router`, `scan_router`, `scan_text_router`.
- **Key modules:**
  - `core.middleware`: API key checks, security headers, idle timeout enforcement.
  - `core.security_events`: structured logging for auth/traffic anomalies.
  - `quiz.recommendations`: rule-based matcher that cross-references ingredients and concerns.
  - `quiz.schemas`: Pydantic schemas returned by endpoints.
- **Background jobs:** Currently handled via Django management commands (e.g., `backend/quiz/management/commands/load_sample_catalog.py`). In production these run via Render cron or GitHub Actions.
- **Email & notifications:** Standard Django email backend configured per environment; used for password resets, quiz summaries, and newsletter opt-ins.

---

## 4. Frontend Experience (Next.js)

- **Code location:** `frontend/`
- **Framework:** Next.js 15 with React 18, Tailwind CSS 4, Jest + Testing Library, Playwright for E2E.
- **Core flows:**
  - Authentication pages calling `/api/v1/auth/**`.
  - Quiz wizard built with client-side state machines; syncs responses to the backend after each answer.
  - Routine builder UI with drag-and-drop and locked favorites.
  - Ingredient checker, barcode scanner (mobile camera access + upload), and label OCR flows.
  - Learning hub that queries `/facts/**` endpoints.
- **Build & deployment:** Vercel handles preview and production builds. Local dev uses `npm run dev` with API requests proxied to `http://localhost:8000`.

---

## 5. Data Management

| Domain | Model(s) | Notes |
|--------|----------|-------|
| Identity | `User`, `UserProfile`, `SkinProfile` | `UserProfile.role` controls admin access; `SkinProfile` captures skin-type metadata |
| Quiz | `QuizSession`, `Question`, `Answer`, `MatchPick` | Sessions store question-by-question answers plus final recommendations |
| Catalog | `Product`, `Ingredient`, `ProductIngredient`, `RestrictionTag`, `SkinTypeTag`, `ProductReview` | Catalog seeded via `load_sample_catalog` command; supports barcode lookups |
| Content | `SkinFactTopic`, `SkinFactContentBlock`, `SkinFactView` | Provides educational articles personalized to interests |
| Engagement | `WishlistItem`, `NewsletterSubscriber`, `QuizFeedback` | Track saved products and qualitative feedback |
| Security & Audit | Security events logged via `core.security_events` to JSON logs; admin actions mirrored via Django’s `LogEntry` |

- **Database:** PostgreSQL 15 (local container + Render-managed instance). JSONB columns store flexible ingredient metadata.
- **Migrations:** Managed via Django; `python manage.py migrate` runs automatically on deploy.
- **Media storage:** Local `media/` directory during development; S3 or Render Disk in production. Barcode/OCR uploads are short-lived and purged after processing.
- **Backups:** `pg_dump --format=c` for database, `aws s3 sync` for media. Run nightly plus ad-hoc before major releases (see `docs/SECURITY.md` advanced backup section).

---

## 6. External Integrations

| Integration | Purpose | Notes |
|-------------|---------|-------|
| Google OAuth (ID tokens) | One-click login (`/auth/oauth/google`) | Requires `GOOGLE_CLIENT_ID` |
| Google Gemini (Generative AI) | Ingredient insight generation and creative copy helper | Controlled via `GOOGLE_API_KEY`; fallback heuristics kick in if responses are low-confidence |
| Email (SMTP/ESP) | Password resets, quiz summaries, ToS delivery | Configured through standard Django email settings, typically SendGrid |
| Barcode decoding (`pyzbar` + `zbar` system lib`) | `/scan/scan` and `/scan/resolve` | Documented brew install steps in `api_scan.py` |
| Newsletter ESP / CRM | `NewsletterSubscriber` hooks; downstream sync handled in operations scripts | -

---

## 7. Deployment Topology

- **Local:** `docker-compose.yml` starts PostgreSQL, pgAdmin, backend (Django + Gunicorn), and frontend (Next.js). Developers can also run services manually (`python manage.py runserver`, `npm run dev`).
- **Staging:**
  - Backend: Render or Dockerized ECS service.
  - Frontend: Vercel preview deployment tied to `main` branch pushes.
  - Database: Managed Postgres with nightly snapshots.
- **Production:**
  - Backend: Containerized service behind HTTPS load balancer (Render, Fly.io, or Kubernetes). Environment variables loaded from secure secret store.
  - Frontend: Vercel production URL with CDN caching.
  - Media: Cloud storage bucket (S3) + CDN for image delivery.
  - Security hardening instructions live in `docs/SECURITY.md` and include TLS, HSTS, firewalling, RBAC, admin IP allow lists.
- **CI/CD:** GitHub Actions pipeline runs lint + tests, publishes Docker images, and triggers deployments via platform APIs.

---

## 8. Operational Monitoring & Logging

- **Health checks:** `/api/v1/healthz` (basic) and `/alerts/environment` (human-curated status) feed uptime services.
- **Metrics & alerts:**
  - Application logs structured as JSON (see `core/logging_utils.JsonLogFormatter`) and shipped to centralized logging.
  - Security events for logins, API key misuse, suspicious paths.
  - Quiz funnel metrics captured through frontend analytics instrumentation.
- **Rate limiting:** Built into `core.middleware.APIKeyMiddleware` with per-IP and per-key throttles. Violations emit `api.rate_limited`.
- **SLOs:** Target 99.5% uptime, <1s median API latency, <5s OCR turnaround for typical images.
- **Disaster recovery:** Quarterly restore drills per `SECURITY.md` Level 2 guidance; document RTO (<2 hours) and RPO (<24 hours).

---

## 9. Security Alignment

Reference `docs/SECURITY.md` for detailed checklists. Highlights:

- **Transport security:** Strict HTTPS, HSTS, secure cookies, CSP via middleware.
- **Authentication:** Password complexity validators, MFA for staff, role-based admin access, idle session timeout.
- **Data protection:** Sanitizers for free-text inputs, allowlisted uploads, CSRF on session-auth routes, API key support for integration clients.
- **Access control:** Admin routes protected by role/IP/country allow lists, `UserProfile.role` enforced via middleware.
- **Monitoring:** Security logger collects structured events for SIEM ingestion. Suspicious endpoints are blocked by `SensitiveFileProtectionMiddleware`.

---

## 10. Configuration Matrix

| Setting | Local | Staging | Production |
|---------|-------|---------|------------|
| `DJANGO_ENV` | `development` | `staging` | `production` |
| `API_VERSION_DEFAULT` | `v1` | `v1` | `v1` (bump when required) |
| `DJANGO_SECURE_SSL_REDIRECT` | `False` | `True` | `True` |
| `DJANGO_SESSION_COOKIE_SECURE` | `False` | `True` | `True` |
| `ADMIN_ALLOWED_IPS` | blank | Office CIDRs | VPN + HQ CIDRs |
| `API_REQUIRE_KEY_FOR_ANONYMOUS` | `False` | `False` | `True` if embedding public widgets |
| `GOOGLE_API_KEY` | optional | staging key | production key with quota alerts |
| `FACT_IMAGE_MAX_UPLOAD_MB` | `5` | `5` | `5` |
| `QUIZ_AUTO_SEED_SAMPLE` | `True` | `False` | `False` (seed manually) |

Keep environment files (`backend/.env.local`, `.env.production`) outside the repo in production deployments. Rotate keys whenever engineers leave the project or an incident is declared.

---

For clarifications or updates to this system design, reach out to architecture@skinmatch.com. Changes to architecture or infrastructure should be reflected here and in `SECURITY.md`/`README.md` as part of the release checklist.
