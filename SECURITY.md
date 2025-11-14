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
DJANGO_USE_PROXY_SSL_HEADER=True
DJANGO_USE_X_FORWARDED_HOST=True
```
Adjust values per environment; keep the stricter settings anywhere public traffic is served.
