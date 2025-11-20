# Database Security Hardening

These operational steps complement the HTTPS/security hardening already documented in `SECURITY.md`. Use them to satisfy the "Database Security" checklist (prepared statements, least privilege, encryption, auditing, and remote-access restrictions).

## Prepared Statements & Parameterized Queries
- Django's ORM and query builder already rely on parameterized statements. Keep business logic inside model/queryset APIs whenever possible.
- When you need raw SQL (migrations or highly-tuned queries), always use Django's DB-API cursor helpers and pass parameters separately:
```python
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute(
        "SELECT id FROM quiz_product WHERE slug = %s LIMIT 1",
        [slug],
    )
```

- Never interpolate user input into SQL strings (`f"... {slug} ..."`). Add code review checklist items to catch violations.
- **Status**: ✅ Verified - all existing cursor.execute calls in migrations are safe.

## Database Least Privilege

Create separate roles per responsibility and only grant what each needs. Example for PostgreSQL:
```sql
-- Run these as a superuser
CREATE ROLE skinmatch_app LOGIN PASSWORD 'app-password';
CREATE ROLE skinmatch_migrations LOGIN PASSWORD 'migration-password';
CREATE ROLE skinmatch_readonly LOGIN PASSWORD 'readonly-password';
GRANT CONNECT ON DATABASE skinmatch TO skinmatch_app, skinmatch_migrations, skinmatch_readonly;
GRANT USAGE ON SCHEMA public TO skinmatch_app, skinmatch_migrations, skinmatch_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO skinmatch_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO skinmatch_app;
REVOKE CREATE, TEMPORARY ON DATABASE skinmatch FROM PUBLIC;
```

- Point the runtime `DATABASE_URL` at `skinmatch_app`. Run migrations/DDL using the `skinmatch_migrations` role only during CI/CD.
- Store credentials in your secret manager; rotate every quarter or when staff/deploy keys change.

## Encryption at Rest

1. **Storage-level**: Enable disk or managed-service encryption (AWS RDS "Encryption at rest", GCP Cloud SQL CMEK, or full-disk LUKS if self-hosted). Snapshot/backup targets must also be encrypted.
2. **Field-level (optional)**: For PII, tokens, or quiz history, wrap columns with a field-encryption library (`django-fernet-fields`, `django-cryptography`, or KMS-backed solutions). Keep encryption keys in KMS/Secrets Manager, never in git.
3. **Backups**: Encrypt dump files (GPG/Age) before uploading to off-site storage.

## Audit & Access Logs

- Enable PostgreSQL connection and statement logging (edit `postgresql.conf` or use your provider's console):
```
log_connections = on
log_disconnections = on
log_statement = 'ddl'
log_duration = on
log_min_duration_statement = 250
```

- Forward `/var/lib/postgresql/data/log/*.log` (or managed log streams) to Loki, CloudWatch, Datadog, etc. Review weekly for unknown IPs, privilege escalations, or bulk data exports. Automate alerts for failed logins and privilege grants.

## Restrict Network Exposure

- Keep Postgres bound to a private interface only. Locally we now publish the container on `127.0.0.1:5432` (see `docker-compose.yml`) so it is not reachable from other hosts.
- In production, avoid opening 5432 to the internet. Use VPC-only endpoints, security groups, or firewalls that allow traffic only from the backend services' IPs. Require VPN/SSH tunnel for manual psql access.
- Remove pgAdmin or other GUI tools from production clusters unless absolutely necessary; if you keep them, guard with SSO/VPN.

Document these controls in your runbook and audit them at least quarterly.
