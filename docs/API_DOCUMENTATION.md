# SkinMatch API Documentation

SkinMatch exposes a versioned REST API implemented with Django Ninja Extra. This document summarizes the contract for clients (web, mobile, third parties) that need to authenticate users, collect ingredient intelligence, and deliver personalized skincare recommendations.

## Table of Contents
1. [Overview & Base URLs](#1-overview--base-urls)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Request & Response Conventions](#3-request--response-conventions)
4. [Error Handling](#4-error-handling)
5. [Endpoint Reference](#5-endpoint-reference)
6. [Rate Limiting & Monitoring](#6-rate-limiting--monitoring)
7. [Change Management](#7-change-management)
8. [API Request/Response Samples](#8-api-requestresponse-samples)

---

## 1. Overview & Base URLs

| Environment | Base URL | Notes |
|-------------|----------|-------|
| Local development | `http://localhost:8000/api/v1` | Run with `docker-compose up --build` or `python manage.py runserver` |
| Staging | `https://staging.api.skinmatch.com/api/v1` | Used for QA and integration tests |
| Production | `https://api.skinmatch.com/api/v1` | All calls must use HTTPS |

- The `NinjaAPI` object exposes `/api/<version>` (default `v1`). The legacy, un-versioned `/api/` path still works but is deprecated.
- All requests and responses use JSON unless a route accepts file uploads (multipart/form-data) such as the OCR endpoints.

---

## 2. Authentication & Authorization

### 2.1 JWT-based user sessions

- After sign-up or login, clients receive a short-lived JWT via `/auth/token`.
- Include `Authorization: Bearer <token>` on every protected request.
- Tokens encode `user_id`, `exp`, and `role` claims. Expiration matches the Django session idle timeout (30 minutes by default) and refresh is required afterward.

### 2.2 Optional API keys

- If `API_REQUIRE_KEY_FOR_ANONYMOUS=True`, unauthenticated routes also require a static key.
- Pass keys via the `X-API-Key` header (configurable through `API_KEY_HEADER`) or `api_key` query parameter (`API_KEY_QUERY_PARAM`).
- Keys can be scoped by CIDR, email contact, and per-minute rate limit (see `core.models.APIClient`).

### 2.3 Admin-only access

- `GET /users` and any Django admin routes require staff credentials plus the `ADMIN_ALLOWED_ROLES`/IP policies described in `docs/SECURITY.md`.

---

## 3. Request & Response Conventions

- **Content Type:** `Content-Type: application/json` unless uploading a file (use `multipart/form-data` for barcode/OCR endpoints).
- **Timestamps:** ISO-8601 with timezone (`2024-09-18T07:30:00Z`).
- **Identifiers:** UUID strings (e.g., quiz sessions, products, wishlist entries).
- **Pagination:** Most listing endpoints return full collections; `/quiz/history` uses simple offsets via `?limit=` and `?cursor=` query params when large result sets are present.
- **Localization:** Textual responses default to English. Currency/pricing uses the currency saved in `UserProfile` when available.

---

## 4. Error Handling

| HTTP Code | Description | Notes |
|-----------|-------------|-------|
| `400 Bad Request` | Validation failure or malformed payload | Ninja returns field-level errors in `{"detail": "..."}` or `{"errors": {"field": "reason"}}` |
| `401 Unauthorized` | Missing or invalid JWT/API key | Re-authenticate or refresh token |
| `403 Forbidden` | Authenticated but not allowed (role/IP mismatch) | Check `UserProfile.role` and admin restrictions |
| `404 Not Found` | Resource missing (e.g., quiz session deleted) | |
| `409 Conflict` | Duplicate username/email, wishlist collisions | |
| `422 Unprocessable Entity` | Business logic validation (e.g., password reuse) | |
| `429 Too Many Requests` | Rate limiting triggered | Honor the `Retry-After` header |
| `500 Internal Server Error` | Unexpected error | Logged to the `security` and `application` loggers |

Every error response follows the structure:

```json
{
  "ok": false,
  "message": "Human-readable description",
  "code": "optional_machine_code"
}
```

---

## 5. Endpoint Reference

Paths below are relative to the base URL (`/api/v1`). Authentication requirements are noted individually.

### 5.1 Health & Metadata

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/healthz` | None | Lightweight health probe for load balancers |
| `GET` | `/hello` | None | Diagnostic endpoint that echoes `"Hello from SkinMatch API"` |
| `GET` | `/alerts/environment` | User JWT | Fetches maintenance windows, outages, or feature flags surfaced by `EnvironmentService` |

### 5.2 Authentication & Profile

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/signup` | None | Create a new user with profile metadata (see schema below) |
| `POST` | `/auth/check-username` | None | Real-time username availability |
| `POST` | `/auth/token` | None | Exchange email/username + password for a JWT |
| `POST` | `/auth/oauth/google` | None | Verify a Google ID token and return a SkinMatch JWT |
| `POST` | `/auth/logout` | User JWT | Revoke the current JWT (client should discard it) |
| `POST` | `/auth/password/forgot` | None | Email a reset link |
| `POST` | `/auth/password/reset` | None | Complete reset with `uid` and `token` from email |
| `POST` | `/auth/password/change` | User JWT | Change password (requires old password) |
| `GET` | `/auth/me` | User JWT | Retrieve combined Django user + profile payload |
| `PUT` | `/auth/me` | User JWT | Update account/profile fields |
| `POST` | `/auth/me/avatar` | User JWT | Upload/change an avatar |
| `GET` | `/users` | Staff JWT | Enumerate users (admin tooling) |

**Sign-up request**:

```json
{
  "first_name": "Nina",
  "last_name": "Perez",
  "username": "nperez",
  "email": "nina@example.com",
  "password": "SecretPass123!",
  "confirm_password": "SecretPass123!",
  "date_of_birth": "1993-07-05",
  "gender": "female",
  "accept_terms_of_service": true,
  "accept_privacy_policy": true
}
```

### 5.3 Newsletter & Legal

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/newsletter/subscribe` | None | Add an email to the marketing list |
| `POST` | `/newsletter/unsubscribe` | Link token | Remove an email |
| `POST` | `/legal/send-terms` | None | Emails the latest ToS/Privacy policy to the requester |

### 5.4 AI Helpers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ai/gemini/generate` | User JWT | Proxy to Google Gemini for copy or insight generation (prompt limited, sanitized) |

Request body:

```json
{ "prompt": "Create a friendly hydration reminder.", "model": "gemini-2.5-flash" }
```

### 5.5 Skin Facts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/facts/topics/popular` | Optional | Most-read topics |
| `GET` | `/facts/topics/section/{section}` | Optional | Topics filtered by section (e.g., `glossary`, `science`) |
| `GET` | `/facts/topics/recommended` | User JWT (optional) | Personalized topic list |
| `GET` | `/facts/topics/{slug}` | Optional | Full content including hero, quick facts, and blocks |

### 5.6 Wishlist

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/wishlist` | User JWT | Retrieve saved products |
| `POST` | `/wishlist/add` | User JWT | Body: `{ "product_id": "<uuid>" }` |
| `DELETE` | `/wishlist/{product_id}` | User JWT | Remove a product from the wishlist |

### 5.7 Quiz Service (router mounted at `/quiz`)

> All quiz endpoints share the path prefix `/quiz` (e.g., `/api/v1/quiz/questions`). Authentication is optional for many routes so anonymous visitors can preview capabilities. When available, a JWT ties sessions to users for history syncing.

#### 5.7.1 Ingredients and metadata

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/quiz/ingredients/suggest?query=niac` | Optional | Typeahead for ingredient names |
| `GET` | `/quiz/ingredients/search?query=niacinamide` | Optional | Returns ingredient cards with benefits, cautions, compatible categories |

#### 5.7.2 Quiz flow

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/quiz/questions` | Optional | Ordered list of quiz questions and choices |
| `POST` | `/quiz/start` | Optional | Opens a quiz session. Payload accepts profile overrides such as `skin_type`. |
| `POST` | `/quiz/answer` | Optional | Body: `{ "session_id": "...", "question_key": "skin_type", "choice": "dry" }` |
| `POST` | `/quiz/submit` | Optional | Finalizes the session and returns `FinalizeOut` (routine, match picks, ingredients to watch) |
| `POST` | `/quiz/feedback` | Optional | Submit thumbs up/down + free text for an answer or result |
| `GET` | `/quiz/feedback/highlights` | Optional | Aggregated success stories/concerns for the marketing site |

#### 5.7.3 History & sessions (JWT required to persist)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/quiz/history` | Lists sessions tied to the authenticated user |
| `DELETE` | `/quiz/history/{history_id}` | Delete a session |
| `GET` | `/quiz/history/profile/{profile_id}` | Full detail for a history record (skin profile + answers) |
| `GET` | `/quiz/session/{session_id}` | Inspect an in-progress session |

#### 5.7.4 Products & reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/quiz/products/{product_id}` | Optional | Rich product detail (description, actives, suitability flags) |
| `GET` | `/quiz/products/{product_id}/reviews` | Optional | Public reviews with pagination |
| `POST` | `/quiz/products/{product_id}/reviews` | User JWT | Create or update a review (`rating`, `summary`, `text`) |
| `DELETE` | `/quiz/products/{product_id}/reviews` | User JWT | Remove the authenticated user’s review |
| `POST` | `/quiz/email-summary` | Optional | Emails a summary of quiz results to the provided address |

### 5.8 Scanning & OCR

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/scan/scan` | Optional | Accepts an image upload; returns barcode value if detected |
| `POST` | `/scan/resolve` | Optional | Upload and decode barcode, then resolve it against the catalog |
| `POST` | `/scan/label/analyze-llm` | Optional | Legacy path mirroring `/scan-text/label/analyze-llm` |
| `POST` | `/scan/label/analyze-text` | Optional | Legacy text ingestion endpoint |
| `POST` | `/scan-text/label/analyze-llm` | Optional | OCR → LLM pipeline for deriving benefits/actives/concerns |
| `POST` | `/scan-text/label/analyze-text` | Optional | Directly analyze pasted ingredient text without OCR |

Payload for `/scan-text/label/analyze-text`:

```json
{
  "text": "Aqua, Glycerin, Niacinamide, Centella Asiatica Extract, ... "
}
```

Response:

```json
{
  "raw_text": "Aqua, Glycerin, Niacinamide...",
  "benefits": ["Niacinamide: Balances tone", "..."],
  "actives": ["Centella Asiatica Extract: Soothes redness"],
  "concerns": ["Fragrance: Can irritate sensitive skin"],
  "notes": ["Pairs well with daily SPF"],
  "confidence": 0.91
}
```

### 5.9 Newsletter analytics & monitoring

The API emits structured logs for every request via `core.security_events`. Set the following headers to aid observability:

- `X-Request-ID`: If omitted, SkinMatch generates one.
- `X-Forwarded-For`: Required when the API sits behind a proxy; otherwise IP-based throttles treat every call as coming from the proxy.

---

## 6. Rate Limiting & Monitoring

- **Per-IP limit:** Defaults to 120 requests/minute per IP across anonymous endpoints (`API_RATE_LIMIT_PER_IP`).
- **Per-key limit:** Each API key can define its own `rate_limit_per_minute`.
- **Per-user limit:** Authenticated quiz submissions throttle at 20 per hour to avoid spam.
- Exceeding limits returns `429` with `Retry-After` (seconds). Repeated bursts create `api.rate_limited` events in the security log.
- **Auditing:** All login attempts trigger `auth.login_success` or `auth.login_failed`. Expect to see them in `/var/log/skinmatch/security.log` or your SIEM sink.

---

## 7. Change Management

- **Schema changes:** All breaking changes target a new version path (`/api/v2`). `v1` will stay online for at least 90 days after a deprecation announcement in the release notes and `/alerts/environment`.
- **Additive changes:** New optional fields or endpoints are logged in `CHANGELOG.md` (planned) and highlighted via the developer newsletter.
- **Testing:** Use the Playwright/Jest suites in `frontend/` and the pytest suite in `backend/` when integrating new endpoints. Contract tests for `/quiz` live under `backend/quiz/tests/`.
- **Contact:** Email developers@skinmatch.com for sandbox keys, higher rate limits, or questions about upcoming releases.

---

## 8. API Request/Response Samples

The following examples demonstrate typical payloads. Replace `https://api.skinmatch.com/api/v1` with your target base URL.

### 8.1 Sign Up → Token → Profile

**Sign up**

```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "first_name": "Jamie",
  "last_name": "Lee",
  "username": "jamielee",
  "email": "jamie@example.com",
  "password": "Secret123!",
  "confirm_password": "Secret123!",
  "date_of_birth": "1996-02-14",
  "gender": "prefer_not",
  "accept_terms_of_service": true,
  "accept_privacy_policy": true
}
```

```json
{
  "ok": true,
  "message": "Account created. Please verify your email."
}
```

**Exchange credentials for a JWT**

```http
POST /api/v1/auth/token
Content-Type: application/json

{
  "identifier": "jamie@example.com",
  "password": "Secret123!"
}
```

```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful."
}
```

**Fetch profile**

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

```json
{
  "first_name": "Jamie",
  "last_name": "Lee",
  "u_id": "9b3fd55d-4eb0-4c89-9975-56f1f097c1c0",
  "username": "jamielee",
  "email": "jamie@example.com",
  "avatar_url": null,
  "date_of_birth": "1996-02-14",
  "gender": "prefer_not",
  "is_staff": false,
  "is_superuser": false,
  "created_at": "2024-11-18T06:42:51.102Z",
  "is_verified": false
}
```

### 8.2 Quiz Session Lifecycle

**Start a session**

```http
POST /api/v1/quiz/start
Authorization: Bearer <token optional>
Content-Type: application/json

{
  "prefill": {
    "skin_type": "dry",
    "main_concern": "acne"
  }
}
```

```json
{
  "session_id": "24b1d3a8-1be3-4d3f-a0fd-e074d6408cd6",
  "status": "in_progress",
  "questions": [
    {"key": "main_concern", "text": "What is your main skincare concern?", "...": "..."}
  ]
}
```

**Answer a question**

```http
POST /api/v1/quiz/answer
Content-Type: application/json

{
  "session_id": "24b1d3a8-1be3-4d3f-a0fd-e074d6408cd6",
  "question_key": "skin_type",
  "choice": "combination"
}
```

```json
{
  "ok": true,
  "completed": false,
  "session_id": "24b1d3a8-1be3-4d3f-a0fd-e074d6408cd6"
}
```

**Submit for results**

```http
POST /api/v1/quiz/submit
Content-Type: application/json

{ "session_id": "24b1d3a8-1be3-4d3f-a0fd-e074d6408cd6" }
```

```json
{
  "summary": {
    "primary_concern": "Acne & breakouts",
    "skin_type": "Combination",
    "confidence": 0.86
  },
  "routine": [
    {
      "step": "Cleanser",
      "products": [
        {
          "id": "b142c8bc-0bd7-44a2-b16c-5df68025d5dd",
          "name": "Barrier Rescue Gel Cleanser",
          "match_score": 0.92,
          "badges": ["Barrier Safe"]
        }
      ]
    }
  ],
  "hero_actives": [
    "Niacinamide: Balances oil production",
    "Centella Asiatica: Calms redness"
  ],
  "watch_out": [
    "Fragrance: Patch test if reactive skin"
  ]
}
```

### 8.3 Ingredient Search

```http
GET /api/v1/quiz/ingredients/search?query=niacinamide
```

```json
{
  "query": "niacinamide",
  "results": [
    {
      "name": "Niacinamide",
      "category": "Vitamin B3",
      "benefits": ["Balances tone", "Supports barrier"],
      "warnings": [],
      "compatible_skin_types": ["oily", "combination", "normal"]
    }
  ]
}
```

### 8.4 Product Details & Wishlist

**Product detail**

```http
GET /api/v1/quiz/products/b142c8bc-0bd7-44a2-b16c-5df68025d5dd
```

```json
{
  "id": "b142c8bc-0bd7-44a2-b16c-5df68025d5dd",
  "name": "Barrier Rescue Gel Cleanser",
  "brand": "SkinMatch Labs",
  "price": 24.5,
  "currency": "USD",
  "image_url": "https://cdn.skinmatch.com/products/cleanser.png",
  "actives": [
    "Niacinamide: Evens tone",
    "B5: Soothes irritation"
  ],
  "ingredient_flags": ["Fragrance Free"],
  "reviews": {
    "average": 4.6,
    "count": 34
  }
}
```

**Save to wishlist**

```http
POST /api/v1/wishlist/add
Authorization: Bearer <token>
Content-Type: application/json

{ "product_id": "b142c8bc-0bd7-44a2-b16c-5df68025d5dd" }
```

```json
{
  "ok": true,
  "message": "Product saved to wishlist.",
  "count": 5
}
```

### 8.5 Label OCR Analysis

```http
POST /api/v1/scan-text/label/analyze-text
Content-Type: application/json

{
  "text": "Ingredients: Aqua, Glycerin, Niacinamide, Centella Asiatica Extract..."
}
```

```json
{
  "raw_text": "Ingredients: Aqua, Glycerin, Niacinamide...",
  "benefits": [
    "Niacinamide: Balances tone and reduces spots",
    "Centella Asiatica: Calms redness"
  ],
  "actives": [
    "Hyaluronic Acid: Pulls moisture into the skin",
    "Panthenol: Soothes stressed barrier"
  ],
  "concerns": [
    "Fragrance: May irritate reactive skin"
  ],
  "notes": [
    "Pairs well with daily SPF",
    "Introduce slowly if also using retinoids"
  ],
  "confidence": 0.91
}
```

### 8.6 Error Sample (Duplicate Username)

```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "first_name": "Jamie",
  "last_name": "Lee",
  "username": "jamielee",
  "email": "another@example.com",
  "password": "Secret123!",
  "confirm_password": "Secret123!",
  "accept_terms_of_service": true,
  "accept_privacy_policy": true
}
```

```json
{
  "ok": false,
  "message": "Username already taken.",
  "code": "username_conflict"
}
```

### 8.7 Rate Limit Sample (HTTP 429)

```json
{
  "detail": "Rate limit exceeded. Try again later.",
  "retry_after": 30
}
```

The server also includes `Retry-After: 30` header seconds. Honor this before retrying to avoid escalated blocking.
