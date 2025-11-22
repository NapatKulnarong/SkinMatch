# SkinMatch — _Your Skin, Your Match, Your Best Care!_

SkinMatch is a personalized skincare recommendation platform that analyzes product ingredients, provides compatibility guidance, and helps users build safe and effective skincare routines.

The project is designed for skincare enthusiasts and individuals with specific concerns who want better routines while minimizing irritation and adverse reactions.

---

## 🌟 Features

- **Skin Profile Setup** — Users input skin type (oily, dry, combination, sensitive, normal) and concerns (acne, wrinkles, dark spots).
- **Ingredient Guidance** — Learn which ingredients are beneficial or harmful for your profile.
- **Personalized Routine Generator** — Daily/weekly routine planner (cleanser, toner, moisturizer, sunscreen, treatments).
- **Product Recommendations** — Suggested products based on safe/compatible ingredients.
- **Product Imagery** — Upload photos in the Django admin or link to hosted images so recommendation cards feel real.
- **Similar Product Finder** _(optional)_ — Find alternatives with similar formulas.
- **Affiliate Integration** _(future)_ — Buy directly from retailers (Shopee, Lazada, Amazon).
- **Feedback & Analytics** — Continuous improvement based on user ratings and outcomes.
- **Expert Resources** _(optional)_ — FAQ and dermatologist/consultation links.

---

## 🛠 Tech Stack

- **Frontend**: React + TailwindCSS
- **Backend**: Django Ninja Extra (FastAPI-like, auto Swagger/ReDoc, built on Django)
- **Database**: PostgreSQL (with JSONB for ingredients & flexible data)
- **Deployment**:
  - Frontend → Vercel
  - Backend → Render (Dockerized)
  - Database → PostgreSQL on Render (daily backups)
- **CI/CD**: GitHub Actions

---

## 🚀 Roadmap (Milestones)

**Week 1–2 (M1)**

- Repo setup, CI/CD, database schema
- Ingredient & compatibility checker (manual entry)

**Week 3–4 (M2)**

- Similar Product Finder
- Rule-based personalized recommendations

**Week 5 (M3)**

- Routine planner (CRUD)
- Feedback capture + analytics dashboard

**Week 6 (M4)** _(optional MVP+)_

- Upload ingredient lists (manual text/OCR stub)
- Expert consultation content

---

## 🧪 Testing

SkinMatch includes comprehensive test suites for both backend and frontend. For detailed testing documentation, see [TESTING.md](./TESTING.md).

**Quick Start:**

**Backend:**

```bash
cd backend
pytest
# or from repo root
make test-pytest
```

**Frontend:**

```bash
cd frontend
npm test -- --runInBand
# Watch mode
npm run test:watch
# E2E tests
npm run test:e2e
```

Tests run automatically in CI/CD on push and pull requests. See [TESTING.md](./docs/TESTING.md) for complete documentation on running tests, writing new tests, and troubleshooting.

---

## ⚙️ Setup & Deployment

1. **Clone repo** 
   ```bash
   git clone https://github.com/your-username/skinmatch.git
   cd skinmatch
   ```
2. **Download Environment File**
   download .env.example*
   ```bash
   cp .env.example .env
   cd backend
   cp .env.example .env
   cd ..
   cd frontend
   cp .env.example .env
   cd ..
   ```

3. **Setup Environment Secret Keys**
   ### 🔸 Backend Secret Keys (./backend/.env)
   DJANGO_SECRET_KEY
   Used by Django for session signing, CSRF protection, password hashing, and cryptographic operations.
   Source: Generate using Python:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
   
   Google OAuth Client Settings
   ![Google OAuth Client Configuration Screenshot](/appendix/cloundconsolefallback.png)
   GOOGLE_OAUTH_CLIENT_ID
   OAuth Client ID for Google Sign-In (backend).
   Source: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID.
   GOOGLE_OAUTH_CLIENT_SECRET
   OAuth Client Secret paired with the above Client ID.
   Source: Google Cloud Console → OAuth 2.0 Client.
   GOOGLE_API_KEY
   API key for Google Gemini / Generative AI / Vision / other Google APIs.
   Source: Google AI Studio or Google Cloud Console → API Keys.
   
   ADMIN_ALLOWED_IPS
   This is used to restrict admin access for improved security.
   Source: Use your own machine’s public IP address.
   
   EMAIL_HOST_USER
   Email address used for sending outgoing system emails.
   Source: Gmail account used as the email sender.
   EMAIL_HOST_PASSWORD
   SMTP password for the email sender.
   Must use Gmail App Password.
   Source: Google Account → Security → App Passwords.

   ### 🔸 Frontend Secret Keys (./frontend/.env)
   NEXT_PUBLIC_GOOGLE_CLIENT_ID
   OAuth Client ID for Google Sign-In on the frontend (browser).
   Source: Google Cloud Console → OAuth 2.0 Client ID.

   ### 🔸 Database & Admin Secrets (.env)
   DB_PASSWORD
   Password for connecting to the PostgreSQL database.
   Source: Defined by the developer (local or docker-compose).
   DB_USER
   Username used to authenticate with PostgreSQL.
   Source: Defined manually when setting up the database (or in docker-compose).
   DB_NAME
   Name of the PostgreSQL database used by the application.
   Source: Set during database creation or defined in docker-compose.
   PGADMIN_EMAIL
   Email used to log into pgAdmin's web UI.
   Source: Chosen by the developer (not a secret, but required for setup).
   PGADMIN_PASSWORD
   Password for logging into pgAdmin web UI.
   Source: Chosen during pgAdmin setup.
   NEXT_PUBLIC_GOOGLE_CLIENT_ID
   OAuth Client ID used by the frontend to initiate Google Sign-In.
   This value must match the OAuth Client created in Google Cloud Console.
   Source: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID.

3. **Load Sample Data**
   ```bash
   cd backend
   python manage.py load_sample --reset
   python manage.py import_skinfact_seed --reset --media-dir=../data/skin_facts_media
   python manage.py seed_demo_users
   ```
   The `load_sample` command is a compatibility alias for `load_sample_catalog` and seeds the quiz database with curated products, concerns, and ingredient mappings. The quiz service auto-seeds this data on first use when running in development (see `QUIZ_AUTO_SEED_SAMPLE`), but running the command manually lets you reset or refresh the catalog on demand. Any additional products you create in the Django admin will automatically participate in quiz recommendations as long as they remain `is_active` and you assign the relevant concerns/traits.

   You can now provide a product photo directly via the `image` field in the Product admin—paste either an absolute URL or a relative media path. When no image is set, SkinMatch renders an on-the-fly gradient card so the UI never falls back to an empty frame. Add any HTTPS product link to the `product_url` field to surface the "View product" button in quiz results.

   *Demo User*
   | Role   | Username            | Password            |
   |--------|---------------------|---------------------|
   | Admin  | **skinmatch_admin** | **AdminPass#123**   |
   | Member | **Testuser001**     | **GlowPass#123**    |
   | Member | **Testuser002**     | **RoutinePass#123** |
   | Member | **Testuser003**     | **FreshPass#123**   |


4. **Run Everything with Docker**
   ```bash
   cd ..
   docker-compose up --build
   ```

ึึ5. **Verify everything is running**
   Backend API: http://localhost:8000
   Frontend: http://localhost:3000


6. **(Optional) Export / import curated Skin Facts**

   We keep the Skin Facts topics (and their hero/block images) under `./data`. Use these commands to refresh or seed another environment:

   ```bash
   # Export current topics + images to data/…
   cd backend
   python manage.py export_skinfact_seed

   # Import them into a clean database (copies media back into ./media)
   python manage.py import_skinfact_seed --reset
   ```

   Both commands default to `../data/skin_facts_seed.json` and `../data/skin_facts_media`, so everything stays in a single folder. Pass `--skip-missing` (export) or `--skip-missing-media` (import) if you want to skip topics whose images weren’t found.

---

## 🔐 Security

Start with the operational checklist in [SECURITY.md](./docs/SECURITY.md) to enable HTTPS, MFA for admins, routine backups, and basic monitoring. Production deployments must override the new `DJANGO_SECURE_*` and cookie env vars documented there so Django enforces TLS-only cookies and HSTS.

- Use the sample `backend/.env.production.example` (copy it to your secrets store) and run commands with `DJANGO_ENV=production` (for example, `DJANGO_ENV=production python manage.py check --deploy`) to load hardened defaults and catch misconfigurations before deploying.
- For database-specific hardening (prepared statements, least-privilege roles, encryption, audit logging), follow [`docs/database-security.md`](./docs/DATABASE_SECURITY.md).
