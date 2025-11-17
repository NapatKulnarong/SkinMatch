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

See [`docs/database-security.md`](./docs/DATABASE_SECURITY.md) for detailed steps covering:

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

### Security Monitoring & Logging

- All high-signal events flow through the dedicated `security` logger using JSON formatting (see `core/logging_utils.JsonLogFormatter`). Point `SECURITY_LOG_FILE` at a location shipped by Fluent Bit/Filebeat or rely on stdout scraping. The logger level is configurable via `SECURITY_LOG_LEVEL`.
- `core.security_events.record_security_event` fans out to log files and (if configured) email alerts. Provide on-call recipients through `SECURITY_ALERT_EMAILS` and trim noise with `SECURITY_ALERT_MIN_LEVEL` (defaults to `ERROR`). Each alert email includes the metadata captured in code.
- Intrusion detection is enforced by `SecurityMonitoringMiddleware`:
  - `SECURITY_SUSPICIOUS_PATH_KEYWORDS` lists substrings that, when requested, generate `traffic.suspicious_path` events (defaults include `wp-admin`, `phpmyadmin`, `.env`, etc.).
  - `SECURITY_MONITOR_STATUS_CODES`, `SECURITY_MONITOR_RATE_THRESHOLD`, and `SECURITY_MONITOR_RATE_WINDOW_SECONDS` define which HTTP statuses and rates (per IP) should trigger `traffic.anomaly` events + alerts.
- Login telemetry is captured via Django signals:
  - Every `user_login_failed` produces a `auth.login_failed` event containing IP, UA, and the attempted identifier. Once an IP generates `SECURITY_FAILED_LOGIN_THRESHOLD` failures inside `SECURITY_FAILED_LOGIN_WINDOW_SECONDS`, the system raises a `auth.bruteforce_detected` alert.
  - Successful logins emit `auth.login_success` events so SOC tools can correlate who is active.
- Django admin changes trigger `admin.action` events via the `LogEntry` signal hook, so there is an immutable audit trail beyond the built-in admin history. Tail `/var/log/skinmatch/security.log` (or your configured log destination) to verify entries whenever staff edit production data.

### API Security Controls

- API consumers must now present either a JWT/OAuth token **or** a dedicated API key. Anonymous requests can be blocked entirely by setting `API_REQUIRE_KEY_FOR_ANONYMOUS=True`. Configure header/query expectations via `API_KEY_HEADER` (defaults to `X-API-Key`) and `API_KEY_QUERY_PARAM`.
- Issue and rotate API keys via the new **API Clients** admin section. Keys are stored hashed (`APIClient.key_hash`), with optional CIDR allow lists and per-key throttles. Store the raw key in your secret manager; Django only persists the hash. Example provisioning flow:
  ```python
  from core.models import APIClient
  client = APIClient(name="Zapier", contact_email="automation@skinmatch.com")
  client.set_key("sm_live_xxxxxxxx")  # generate a strong random token first
  client.allowed_ips = ["203.0.113.17", "10.10.0.0/16"]
  client.rate_limit_per_minute = 60
  client.save()
  ```
- `core.middleware.APIKeyMiddleware` enforces API key requirements, applies per-IP and per-key throttles (`API_RATE_LIMIT_*` env vars), and logs usage via the `security` logger (`event_type=api.request`). Exceeding limits generates `429` responses and fires `api.rate_limited` / `api.ip_rate_limited` events.
- `APIInputValidationMiddleware` performs coarse payload validation before requests hit the app: configure maximum payload size with `API_MAX_BODY_KB` and sanitize high-risk patterns via `API_INPUT_BLOCKLIST` (comma-separated regex fragments). Offending requests are rejected with `400`/`413` plus alerting through `security` logs.
- Versioned routing is now available at `/api/v1/` (see `API_VERSION_DEFAULT`). Keep `/api/` wired during migration, but plan to deprecate it once clients move to versioned endpoints.
- API usage is continuously monitored through the same security logging pipeline and can be forwarded to your SIEM. Combine the structured logs with upstream metrics (e.g., load balancer stats) for anomaly detection and alerting.

### File & Directory Hardening

- Serve config secrets from outside the repo root. Point `DJANGO_ENV_FILE` at `/etc/skinmatch/.env` (or your secret manager's mounted path) so Django never exposes `.env` even if the project directory becomes web-accessible. The loader still falls back to in-repo `.env` for local development.
- `SensitiveFileProtectionMiddleware` blocks common reconnaissance targets (`.env`, `.git`, `xmlrpc.php`, `docker-compose.yml`, etc.). Tune the denylist with `SENSITIVE_PATH_PATTERNS` if you have additional artifacts that should never leak.
- Run `./scripts/harden_permissions.sh /var/www/skinmatch` (or omit the argument to target the repo root) after each deploy. It sets directories to `0755`, files to `0644`, and tightens `.env*` files to `0600`. Execute it as the deploy user or via CI/CD before reloading services.
- If you front Django with Nginx/Apache, ensure directory indexing is disabled (`autoindex off;` for Nginx, `Options -Indexes` for Apache) and block direct access to `/media/.git`, `/media/.env*`, etc. The middleware covers Django-served paths, but the web server must also enforce these rules for static/media assets.
- We do not rely on XML-RPC; the middleware now responds with `404` for `/xmlrpc.php` probes to reduce noise. Apply equivalent deny rules at the load balancer or CDN to drop traffic earlier.

### Dependency & Code Security

- The CI workflow (`.github/workflows/ci.yml`) already installs `bandit` and `pip-audit` to flag insecure Python code and vulnerable dependencies on every PR. Keep the jobs in place and fail the build once you are ready to block on findings (remove the `|| true` guards).
- Add GitHub-native dependency watchers: enable Dependabot (GitHub → Settings → Code security and analysis → Dependabot alerts/updates) or Snyk if you prefer their dashboard. Configure weekly update PRs for `backend/requirements.txt` and `frontend/package.json` so outdated packages are surfaced quickly.
- Schedule a monthly `pip-audit -r backend/requirements.txt` + `npm audit` run outside CI (e.g., via cron or GitHub Actions `workflow_dispatch`) to catch issues even if CI isn't executed for long stretches.
- The `secret-scan.yml` workflow runs `gitguardian/ggshield` against pushes. Extend it with Trivy or Grype if you want container/Docker image scanning as part of the same pipeline.
- Remove dead/commented-out code, debugging helpers, or `print` statements before merging. Rely on structured logging (`logging.debug/info/...`) that can be filtered per environment. Periodically run `rg -n "print(" backend frontend` to make sure stray debug prints don't sneak into prod.

### Advanced Backup Strategy

- **Versioned backups:** Run `pg_dump --format=custom --file=/backups/pg/$(date -u +%Y%m%dT%H%M%SZ)_skinmatch.dump` nightly and keep at least 30 days of snapshots. For media assets, use `aws s3 sync media/ s3://skinmatch-media-backups/$(date -u +%Y/%m/%d)/ --delete --exact-timestamps` so every run lands in a time-stamped prefix.
- **Encrypt at rest and in transit:** Pipe database dumps through `age` or `gpg` before uploading (`pg_dump ... | age -r backup@skinmatch.com > dump.age`) and enable SSE-KMS/SSE-C on the object store bucket. Rotate the encryption keys annually and after staff changes.
- **Geo-diverse storage:** Replicate backups to at least two regions (e.g., AWS S3 `ap-southeast-1` and `us-west-2`) or mix providers (S3 + Backblaze B2). Use lifecycle policies to tier older versions into Glacier/Deep Archive while keeping last 7 days in hot storage for quick restores.
- **Test disaster recovery:** Once per quarter, restore the latest backup into a staging environment: `pg_restore --clean --dbname=skinmatch_dr --format=custom dump.age` (after decrypting) and `aws s3 sync s3://skinmatch-media-backups/latest media-restore/`. Script the steps and record the time taken so deviations are obvious.
- **Document RTO/RPO:** Keep a runbook (e.g., `docs/runbooks/disaster-recovery.md`) that states Recovery Time Objective (target: < 2 hours to restore DB + media) and Recovery Point Objective (target: < 24 hours of data loss). Note who is on-call for DR, where credentials live, and how to escalate if restore windows are exceeded.

### Security Testing
- **Automated scans:** Schedule a weekly GitHub Actions workflow (e.g., cron `0 3 * * Mon`) that reuses the Bandit + pip-audit steps plus `npm audit` for the frontend. Augment with OWASP ZAP baseline scan against staging: `docker run -t owasp/zap2docker-stable zap-baseline.py -t https://staging.skinmatch.com -r zap-report.html`. Publish results as workflow artifacts.
- **Penetration tests:** At least twice a year, have an internal engineer or third party run a lightweight pentest focusing on authentication flows, admin access, and customer data exfiltration. Capture findings in Jira with severity labels and remediation owners.
- **OWASP Top 10 validation:** Map each risk (A01 injection, A02 auth, etc.) to concrete test cases. For example, use Burp/ZAP to fuzz inputs for SQLi/XSS, verify rate limiting for brute-force, check S3 buckets for misconfigurations (A05 security misconfiguration), and confirm sensitive data exposure protections (A03).
- **Attack simulations:** Coordinate with the ops team to run tabletop exercises (phishing compromise, leaked API key, ransomware). For each scenario, simulate alert channels (PagerDuty/Slack), incident response checklist, and post-mortem. Track timing to see if RTO/RPO and SOC playbooks hold up.
- **Review & remediation:** Security scan outputs (Bandit, pip-audit, ZAP, pentest reports) should feed into your issue tracker within 24 hours. Triage monthly, prioritizing Critical/High issues for resolution in the current sprint and documenting accept-risk decisions for anything deferred.
