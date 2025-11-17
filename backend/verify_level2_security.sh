#!/bin/bash
# Level 2 Security Verification Script for SkinMatch
# Usage:
#   cd backend
#   chmod +x verify_level2_security.sh
#   ./verify_level2_security.sh

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  SkinMatch Level 2 Security Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

passed=0
failed=0
warnings=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((passed++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((failed++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((warnings++))
}

echo -e "${BLUE}1. Security Headers${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "CONTENT_SECURITY_POLICY" .env.production.example; then
    check_pass "Content Security Policy (CSP) configured"
else
    check_fail "CSP not found in .env.production.example"
fi

if grep -q "X_FRAME_OPTIONS" .env.production.example; then
    check_pass "X-Frame-Options configured (clickjacking protection)"
else
    check_fail "X-Frame-Options not configured"
fi

if grep -q "SECURE_HSTS_SECONDS" .env.production.example; then
    check_pass "HSTS (Strict-Transport-Security) configured"
else
    check_fail "HSTS not configured"
fi

if grep -q "SECURE_REFERRER_POLICY" .env.production.example; then
    check_pass "Referrer-Policy configured"
else
    check_warn "Referrer-Policy not explicitly set"
fi

echo ""
echo -e "${BLUE}2. Database Security${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "../DATABASE_SECURITY.md" ]; then
    check_pass "Database security documentation exists"
else
    check_fail "DATABASE_SECURITY.md not found"
fi

unsafe_sql=$(grep -r "cursor.execute.*f\"" --include="*.py" .. 2>/dev/null | grep -v ".venv" || true)
if [ -z "$unsafe_sql" ]; then
    check_pass "No unsafe SQL string interpolation found"
else
    check_fail "Found potential SQL injection vulnerability"
    echo "   $unsafe_sql"
fi

if [ -f "scripts/setup_db_roles.sql" ]; then
    check_pass "Database role setup script exists"
else
    check_warn "Database role setup script not found"
fi

if grep -q "127.0.0.1:5432" ../docker-compose.yml 2>/dev/null; then
    check_pass "Database bound to localhost only"
else
    check_warn "Database binding not verified in docker-compose.yml"
fi

echo ""
echo -e "${BLUE}3. Input Validation & Sanitization${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "CSRF_COOKIE_SECURE" .env.production.example; then
    check_pass "CSRF protection configured"
else
    check_fail "CSRF settings not found"
fi

if grep -rq "FileExtensionValidator" --include="*.py" .. 2>/dev/null | grep -v ".venv"; then
    check_pass "File upload validators implemented"
else
    check_warn "No file upload validators found"
fi

if grep -rq "clean_" --include="*.py" core/ 2>/dev/null; then
    check_pass "Custom form validation methods found"
else
    check_warn "No custom form validation detected"
fi

echo ""
echo -e "${BLUE}4. Advanced Access Control${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "SESSION_COOKIE_SECURE" .env.production.example; then
    check_pass "Secure session cookies configured"
else
    check_fail "Session cookie security not configured"
fi

if grep -q "SESSION_COOKIE_HTTPONLY" .env.production.example; then
    check_pass "HTTPOnly session cookies configured"
else
    check_warn "HTTPOnly flag not explicitly set"
fi

if grep -q "SESSION_COOKIE_SAMESITE" .env.production.example; then
    check_pass "SameSite cookie attribute configured"
else
    check_warn "SameSite attribute not configured"
fi

if grep -rq "@login_required\|@permission_required" --include="*.py" .. 2>/dev/null | grep -v ".venv"; then
    check_pass "Authentication decorators in use"
else
    check_warn "No authentication decorators found"
fi

echo ""
echo -e "${BLUE}5. Security Monitoring & Logging${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -rq "LOGGING\s*=" apidemo/settings.py; then
    check_pass "Django logging configured"
else
    check_warn "Logging configuration not found in settings.py"
fi

if grep -rq "created_at\|updated_at\|modified" --include="*.py" core/models.py 2>/dev/null; then
    check_pass "Timestamp fields for audit trail found"
else
    check_warn "No audit timestamp fields detected"
fi

echo ""
echo -e "${BLUE}6. API Security${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "core/middleware.py" ] || grep -rq "authentication_classes" --include="*.py" .. 2>/dev/null | grep -v ".venv"; then
    check_pass "API authentication mechanisms found"
else
    check_warn "API authentication not detected"
fi

if grep -rq "throttle\|rate_limit" --include="*.py" .. 2>/dev/null | grep -v ".venv"; then
    check_pass "Rate limiting implemented"
else
    check_warn "Rate limiting not detected"
fi

if grep -q "CORS_ALLOWED_ORIGINS" .env.production.example 2>/dev/null || grep -q "CORS" apidemo/settings.py 2>/dev/null; then
    check_pass "CORS configuration found"
else
    check_warn "CORS settings not configured"
fi

echo ""
echo -e "${BLUE}7. File & Directory Hardening${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "^\.env$" ../.gitignore; then
    check_pass ".env files excluded from git"
else
    check_fail ".env not in .gitignore"
fi

if grep -rq "password.*=.*['\"][^'\"]\\{8,\\}['\"]" --include="*.py" .. 2>/dev/null | grep -v ".venv" | grep -v "example"; then
    check_warn "Potential hardcoded credentials found (review manually)"
else
    check_pass "No obvious hardcoded credentials"
fi

if grep -q "DJANGO_DEBUG=False" .env.production.example; then
    check_pass "DEBUG disabled in production template"
else
    check_fail "DEBUG not explicitly disabled in production"
fi

echo ""
echo -e "${BLUE}8. Dependency & Code Security${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "../requirements.txt" ]; then
    check_pass "requirements.txt exists"
    if grep -q "django-csp\|django-security" ../requirements.txt; then
        check_pass "Security-related packages installed"
    else
        check_warn "No explicit security packages in requirements.txt"
    fi
else
    check_fail "requirements.txt not found"
fi

commented_lines=$(grep -r "^\s*#.*TODO\|^\s*#.*FIXME\|^\s*#.*HACK" --include="*.py" .. 2>/dev/null | grep -v ".venv" | wc -l || true)
if [ "$commented_lines" -lt 5 ]; then
    check_pass "Minimal technical debt comments"
else
    check_warn "Found $commented_lines TODO/FIXME comments (review and clean)"
fi

echo ""
echo -e "${BLUE}9. Advanced Backup Strategy${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -rq "backup\|Backup" --include="*.md" .. 2>/dev/null; then
    check_pass "Backup procedures documented"
else
    check_warn "Backup strategy not documented"
fi

if grep -q "volumes:" ../docker-compose.yml 2>/dev/null; then
    check_pass "Docker volumes configured (enables backups)"
else
    check_warn "No docker volumes found"
fi

echo ""
echo -e "${BLUE}10. Security Testing${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "SECURITY.md" ] || [ -f "../SECURITY.md" ]; then
    check_pass "Security documentation exists"
else
    check_fail "SECURITY.md not found"
fi

echo -n "   Running Django deployment check... "
if DJANGO_ENV=production python3 manage.py check --deploy --fail-level WARNING 2>&1 | grep -q "System check identified no issues"; then
    echo -e "${GREEN}✓${NC}"
    check_pass "Django deployment checks pass"
else
    echo -e "${RED}✗${NC}"
    check_fail "Django deployment checks failed"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}Passed:${NC}   $passed"
echo -e "${YELLOW}Warnings:${NC} $warnings"
echo -e "${RED}Failed:${NC}   $failed"
echo ""

total=$((passed + warnings + failed))
percentage=$((passed * 100 / total))

if [ $failed -eq 0 ] && [ $warnings -lt 5 ]; then
    echo -e "${GREEN}★ Level 2 Security: EXCELLENT (${percentage}% passed)${NC}"
    echo "   Your application has strong intermediate security!"
elif [ $failed -lt 3 ]; then
    echo -e "${YELLOW}⚠ Level 2 Security: GOOD (${percentage}% passed)${NC}"
    echo "   Address warnings and failed checks for better security."
else
    echo -e "${RED}✗ Level 2 Security: NEEDS IMPROVEMENT${NC}"
    echo "   Please address the failed checks before deployment."
fi

echo ""
echo "Next steps:"
echo "  1. Review and fix any failed checks"
echo "  2. Address warnings for production deployment"
echo "  3. Run: python3 manage.py check --deploy"
echo "  4. Consider implementing Level 3 security measures"
echo ""
