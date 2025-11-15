# Level 1 Security Hardening Guide

This repository now includes secure-by-default Django settings (see `backend/apidemo/settings.py`) and the environment flags documented below. Follow the operational checklist to finish “Level 1: Essential Website Security”. Use `backend/.env.production.example` as the baseline for deployment secrets (copy it to your secret manager or `.env.production`) and run checks with `DJANGO_ENV=production python manage.py check --deploy` so Django loads the hardened defaults before each release.

## 1. HTTPS / SSL Certificate

- Terminate TLS with your ingress (Nginx/Traefik/Cloudflare). Issue certificates with Let’s Encrypt (`certbot --nginx -d skinmatch.com -d www.skinmatch.com`) or your host’s tooling.
- Set these env vars in production: `DJANGO_SECURE_SSL_REDIRECT=True`, `DJANGO_SESSION_COOKIE_SECURE=True`, `DJANGO_CSRF_COOKIE_SECURE=True`, `DJANGO_SECURE_HSTS_SECONDS=31536000`, `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True`, `DJANGO_SECURE_HSTS_PRELOAD=True`.
- Keep `DJANGO_USE_PROXY_SSL_HEADER=True` so Django trusts the upstream proxy’s `X-Forwarded-Proto` header. Verify HTTP→HTTPS redirects after deploy.

## 1b. Security Headers

- Content Security Policy is enforced by `core.middleware.SecurityHeadersMiddleware`. Tune it through `DJANGO_CONTENT_SECURITY_POLICY` (string) and `DJANGO_CSP_REPORT_ONLY` (bool). Default policy blocks external frames, restricts scripts/styles to `'self'`, and allows inline scripts/styles for Django admin convenience.
- `X-Frame-Options` comes from `DJANGO_X_FRAME_OPTIONS` (defaults to `DENY`), so only override it if you embed the app elsewhere.
- `X-Content-Type-Options: nosniff` and `Strict-Transport-Security` are emitted automatically when the respective `SECURE_*` settings are enabled; keep them turned on wherever HTTPS terminates.
- `SECURE_REFERRER_POLICY` controls the `Referrer-Policy` header. The default `strict-origin-when-cross-origin` is a solid balance between usability and privacy.

## 2. Strong Authentication

- Password strength is enforced via Django’s validators plus `core.password_validators.ComplexityPasswordValidator`.
- For staff/admins, enable MFA through `django-allauth[mfa]` or `django-otp` and require hardware keys or TOTP. Document recovery procedures in your ops runbook.
- Audit superusers monthly; avoid “admin” usernames and rotate credentials after personnel changes.

## 3. Keep Everything Updated

- Backend: `cd backend && pip install -U -r requirements.txt && pip list --outdated` each sprint; run the Django test suite before deploying.
- Frontend: `cd frontend && npm outdated` and apply patches with `npm install <pkg>@latest`; lint (`npm run lint`) and test (`npm run test`) afterwards.
- Track CVEs for Docker base images (`python`, `postgres:15`, `node`) and rebuild when tags update. Renovate/Dependabot can automate PRs.

## 4. Basic Firewall Protection

- Production ingress should only expose ports 80/443. Keep Postgres (`5432`), pgAdmin (`5050`), and internal services bound to a private network (adjust compose or use separate `docker-compose.prod.yml`).
- Enable your host’s firewall (`ufw allow 22 80 443`, deny others) or use cloud security groups. If you use Cloudflare/AWS ALB, enable their WAF/rate-limiting rulesets.

## 5. Regular Backups

- Postgres: schedule nightly `pg_dump --format=c` jobs against the `postgres_data` volume, encrypt the dumps, and store them off-site (S3 + Glacier).
- Media: snapshot the `media-data` volume at least weekly and copy to a separate region/bucket.
- Run quarterly restore drills into staging to verify the dumps and document the process.

## 6. Limit Login Attempts

- `ACCOUNT_RATE_LIMITS` already throttles failed logins; tighten via `ACCOUNT_RATE_LIMIT_LOGIN_FAILED=3/10m` in production.
- Consider adding `django-axes` or `django-ratelimit` if you need IP-based lockouts or CAPTCHA after N failures.

## 7. Remove Unnecessary Access

- Purge dormant Django/Next accounts every quarter. Revoke API tokens for unused service users.
- Remove unused plugins/dependencies and keep `pgadmin`/debug tooling out of production compose stacks.
- Keep file editing disabled in Django admin and restrict `is_superuser` to the smallest possible group.

## 8. Basic Monitoring

- Add uptime monitoring for `https://skinmatch.com/` and `/healthz` (e.g., UptimeRobot, BetterStack). Alert Slack/Email/PagerDuty.
- Centralize logs (Loki, CloudWatch, Datadog) and review access logs weekly for spikes or repeated 4xx/5xx codes.
- Enable automated security scans (Cloudflare scanner, OpenVAS against staging) and extend CI with `python manage.py check --deploy` to catch insecure settings before deploys.

## 9. Database Security

See [`docs/database-security.md`](./docs/database-security.md) for detailed steps covering:

- Prepared statements / parameterized queries (ORM-first, raw cursor helpers)
- Principle of least privilege (separate roles for app, migrations, read-only)
- Encryption at rest (disk-level and optional column encryption)
- Audit logging (connection/statement logging plus forwarding guidance)
- Disabling remote DB access (bind Postgres to private interfaces only)

## 10. Input Validation & Sanitization

- Quiz feedback and product reviews are cleaned via `core.sanitizers` before they are saved or serialized, so any HTML/JS snippets are stripped server-side.
- Those models now call `full_clean()` inside `save()`, guaranteeing that Django validators (rating bounds, uniqueness, etc.) run for every write.
- Image uploads for Skin Facts are limited to a MIME allowlist plus the `FACT_IMAGE_MAX_UPLOAD_MB` cap (see `.env`), enforced by `core.validators`.
- CSRF protection stays enabled globally via `django.middleware.csrf.CsrfViewMiddleware`; avoid adding `@csrf_exempt` to POST/PUT/PATCH/DELETE endpoints unless absolutely necessary.
- Reuse the helpers in `core.sanitizers`/`core.validators` whenever you add new user input or upload surfaces.

## Quick Reference: Security Env Vars

Set these in your production `.env` (values shown are secure defaults):

```
DJANGO_ENV=production
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
DJANGO_SESSION_COOKIE_HTTPONLY=True
DJANGO_CSRF_COOKIE_HTTPONLY=True
DJANGO_SESSION_COOKIE_SAMESITE=Lax  # or Strict
DJANGO_CSRF_COOKIE_SAMESITE=Lax
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True
DJANGO_SECURE_HSTS_PRELOAD=True
DJANGO_SECURE_REFERRER_POLICY=strict-origin-when-cross-origin
DJANGO_X_FRAME_OPTIONS=DENY
DJANGO_CONTENT_SECURITY_POLICY="default-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
DJANGO_CSP_REPORT_ONLY=False
FACT_IMAGE_MAX_UPLOAD_MB=5
DJANGO_USE_PROXY_SSL_HEADER=True
DJANGO_USE_X_FORWARDED_HOST=True
```

Adjust values per environment; keep the stricter settings anywhere public traffic is served.

## Level 2: Advanced Access Control

### Role-Based Access Control (RBAC)
- `UserProfile` now includes a `role` field with predefined choices (`admin`, `staff`, `read_only`, `member`). A data migration maps existing superusers to `admin` and staff users to `staff`.
- Assign roles for new staff inside Django admin (User Profile inline) or via shell:
  ```python
  from core.models import UserProfile
  profile = UserProfile.objects.select_related("user").get(user__email="ops@skinmatch.com")
  profile.role = UserProfile.Role.ADMIN
  profile.save(update_fields=["role"])
  ```
- The new `core.middleware.AdminAccessControlMiddleware` enforces that only staff members whose profile role is listed in `ADMIN_ALLOWED_ROLES` can reach admin URLs (superusers still bypass the check).

### Admin IP & Country Allow Lists
- `ADMIN_ALLOWED_IPS` accepts comma-separated IPs or CIDR ranges (e.g., `203.0.113.17,10.10.0.0/16`). Only requests whose client IP (after applying headers from `ADMIN_TRUSTED_IP_HEADERS`) match one of those networks can load admin routes.
- Add multiple admin paths with `ADMIN_PROTECTED_PATH_PREFIXES` if you expose additional control panels.
- Optional geographic restrictions rely on upstream geo headers such as `CF-IPCountry`. Set `ADMIN_ALLOWED_COUNTRIES=SG,TH` to only allow those ISO codes. Leave empty to disable the geo check or override the header names through `ADMIN_COUNTRY_HEADERS`.

### Session Timeout & Secure Cookies
- Sessions expire after `DJANGO_SESSION_COOKIE_AGE` seconds (default 4 hours) and the new `SessionIdleTimeoutMiddleware` logs idle users out after `DJANGO_SESSION_IDLE_TIMEOUT_SECONDS` (default 30 minutes). Customize exemption paths with `DJANGO_SESSION_IDLE_TIMEOUT_EXEMPT_PATHS` if you need long-lived uploads or health probes.
- API consumers receive a JSON `401` when the idle timeout triggers; browser sessions are redirected to `DJANGO_SESSION_TIMEOUT_REDIRECT_URL` (defaults to `/login?timeout=1`).
- Keep `DJANGO_SESSION_COOKIE_SECURE=True`, `DJANGO_SESSION_COOKIE_HTTPONLY=True`, and (ideally) `DJANGO_SESSION_EXPIRE_AT_BROWSER_CLOSE=True` in production so cookies are never exposed to insecure transport or JavaScript.

### Deployment Checklist
1. Run `python manage.py migrate` so the new `role` column exists.
2. Populate staff roles (see RBAC section) before re-opening admin access.
3. Set `ADMIN_ALLOWED_IPS`/`ADMIN_ALLOWED_ROLES`/`ADMIN_ALLOWED_COUNTRIES` in your secret manager and reload the app.
4. Smoke test admin login from an allowed IP and confirm blocked responses from non-allowed IPs or countries. Use `curl -H 'CF-IPCountry: XX'` locally to simulate different geographies if needed.
