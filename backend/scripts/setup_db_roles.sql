-- Database Role Setup for SkinMatch
-- Run as postgres superuser: psql -U postgres -d skinmatch -f setup_db_roles.sql

-- Create roles
CREATE ROLE skinmatch_app LOGIN PASSWORD 'change-this-app-password';
CREATE ROLE skinmatch_migrations LOGIN PASSWORD 'change-this-migration-password';
CREATE ROLE skinmatch_readonly LOGIN PASSWORD 'change-this-readonly-password';

-- Grant database access
GRANT CONNECT ON DATABASE skinmatch TO skinmatch_app, skinmatch_migrations, skinmatch_readonly;
GRANT USAGE ON SCHEMA public TO skinmatch_app, skinmatch_migrations, skinmatch_readonly;

-- Grant table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO skinmatch_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO skinmatch_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO skinmatch_migrations;

-- Grant sequence permissions (for auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO skinmatch_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO skinmatch_migrations;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO skinmatch_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO skinmatch_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skinmatch_migrations;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO skinmatch_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skinmatch_migrations;

-- Revoke public access
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
