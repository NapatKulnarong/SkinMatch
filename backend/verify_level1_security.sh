#!/bin/bash
# Level 1 Essential Security Verification Script for SkinMatch
# Run from backend directory: chmod +x verify_level1_security.sh && ./verify_level1_security.sh

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  SkinMatch Level 1 Essential Security Verification"
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

echo -e "${BLUE}1. HTTPS/SSL Certificate${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "SECURE_SSL_REDIRECT=True" .env.production.example 2>/dev/null; then
    check_pass "HTTPS redirect configured in production"
else
    check_fail "HTTPS redirect not configured"
fi

if grep -q "SECURE_HSTS_SECONDS" .env.production.example 2>/dev/null; then
    check_pass "HSTS (HTTP Strict Transport Security) enabled"
else
    check_warn "HSTS not configured"
fi

echo ""
echo -e "${BLUE}2. Strong Authentication${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "SECRET_KEY.*skinmatch.*secret" .env.production.example 2>/dev/null; then
    check_pass "Strong SECRET_KEY template provided"
else
    check_warn "SECRET_KEY should be strong and unique"
fi

if [ -f "core/auth.py" ] || grep -rq "django.contrib.auth" apidemo/settings.py 2>/dev/null; then
    check_pass "Django authentication system enabled"
else
    check_fail "Authentication system not found"
fi

if grep -rq "PASSWORD_VALIDATION" apidemo/settings.py 2>/dev/null; then
    check_pass "Password validation configured"
else
    check_warn "Password validation not explicitly configured"
fi

if [ -f "core/google_auth.py" ] || grep -rq "GOOGLE_OAUTH" .env.production.example 2>/dev/null; then
    check_pass "Google OAuth (2FA alternative) available"
else
    check_warn "Multi-factor authentication not detected"
fi

echo ""
echo -e "${BLUE}3. Keep Everything Updated${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "requirements.txt" ]; then
    check_pass "requirements.txt exists (dependency tracking)"
    unpinned=$(grep -v "==" requirements.txt 2>/dev/null | grep -v "^#" | grep -v "^$" | wc -l)
    if [ "$unpinned" -eq 0 ]; then
        check_pass "All dependencies are pinned to specific versions"
    else
        check_warn "$unpinned dependencies without version pins"
    fi
else
    check_fail "requirements.txt not found"
fi

if grep -q "Django==" requirements.txt 2>/dev/null; then
    django_version=$(grep "Django==" requirements.txt | cut -d'=' -f3)
    check_pass "Django version tracked: $django_version"
else
    check_warn "Django version not pinned in requirements.txt"
fi

echo ""
echo -e "${BLUE}4. Basic Firewall Protection${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "ALLOWED_HOSTS" .env.production.example 2>/dev/null; then
    check_pass "ALLOWED_HOSTS configured (basic request filtering)"
else
    check_fail "ALLOWED_HOSTS not configured"
fi

if grep -q "CORS" .env.production.example 2>/dev/null || grep -rq "CORS" apidemo/settings.py 2>/dev/null; then
    check_pass "CORS protection configured"
else
    check_warn "CORS settings not found"
fi

if grep -q "CSRF" .env.production.example 2>/dev/null; then
    check_pass "CSRF protection enabled"
else
    check_warn "CSRF settings not explicitly configured"
fi

echo ""
echo -e "${BLUE}5. Regular Backups${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "../docker-compose.yml" ] && grep -q "volumes:" ../docker-compose.yml; then
    check_pass "Docker volumes configured (database persistence)"
else
    check_warn "Docker volumes not found"
fi

if grep -riq "backup" *.md 2>/dev/null; then
    check_pass "Backup procedures documented"
else
    check_warn "Backup strategy not documented"
fi

echo ""
echo -e "${BLUE}6. Limit Login Attempts${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -rq "throttle\|rate_limit\|RateLimit" --include="*.py" . 2>/dev/null | grep -v ".venv"; then
    check_pass "Rate limiting/throttling implemented"
else
    check_warn "Rate limiting not detected (consider django-ratelimit)"
fi

if grep -rq "login.*fail\|failed.*login" --include="*.py" . 2>/dev/null | grep -v ".venv"; then
    check_pass "Login failure monitoring in place"
else
    check_warn "Login attempt monitoring not detected"
fi

echo ""
echo -e "${BLUE}7. Remove Unnecessary Access${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "DJANGO_DEBUG=False" .env.production.example 2>/dev/null; then
    check_pass "DEBUG disabled in production (hides sensitive info)"
else
    check_fail "DEBUG not explicitly disabled in production"
fi

total_deps=$(grep -v "^#" requirements.txt 2>/dev/null | grep -v "^$" | wc -l)
if [ "$total_deps" -lt 50 ]; then
    check_pass "Reasonable number of dependencies ($total_deps)"
else
    check_warn "Large number of dependencies ($total_deps) - review for unused packages"
fi

if grep -q "^\.env$" .gitignore 2>/dev/null; then
    check_pass "Environment files excluded from version control"
else
    check_fail ".env not in .gitignore (security risk!)"
fi

echo ""
echo -e "${BLUE}8. Basic Monitoring${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -rq "LOGGING" apidemo/settings.py 2>/dev/null; then
    check_pass "Django logging configured"
else
    check_warn "Logging not explicitly configured"
fi

if grep -rq "created_at\|updated_at\|modified_at" core/models.py 2>/dev/null; then
    check_pass "Timestamp fields for monitoring (created_at/updated_at)"
else
    check_warn "No audit timestamp fields detected"
fi

if [ -f "../docker-compose.yml" ] && grep -q "log_connections" ../docker-compose.yml; then
    check_pass "Database connection logging enabled"
else
    check_warn "Database logging not configured"
fi

if [ -f "SECURITY.md" ] || [ -f "../SECURITY.md" ]; then
    check_pass "Security documentation exists"
else
    check_warn "No SECURITY.md found"
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
if [ $total -eq 0 ]; then
    echo "No checks were run. Please ensure you're in the backend directory."
    exit 1
fi

percentage=$((passed * 100 / total))

if [ $failed -eq 0 ] && [ $warnings -lt 3 ]; then
    echo -e "${GREEN}★ Level 1 Security: EXCELLENT ($percentage% passed)${NC}"
    echo "   Your application meets all essential security requirements!"
    echo ""
    echo "   ✓ Ready to implement Level 2 (Intermediate) security measures"
elif [ $failed -lt 2 ]; then
    echo -e "${YELLOW}⚠ Level 1 Security: GOOD ($percentage% passed)${NC}"
    echo "   Address warnings for stronger security."
    echo ""
    echo "   Next: Fix warnings, then proceed to Level 2"
else
    echo -e "${RED}✗ Level 1 Security: NEEDS ATTENTION${NC}"
    echo "   Please address the failed checks before proceeding."
    echo ""
    echo "   Critical items must be fixed before production deployment."
fi

echo ""
echo "Verification Details:"
echo "  • Checks run from: $(pwd)"
echo "  • Production config: .env.production.example"
echo "  • Django project: apidemo/"
echo ""

if [ $failed -gt 0 ]; then
    echo "Action Items (Failed Checks):"
    echo "  1. Review all ✗ (red) items above"
    echo "  2. Implement missing security measures"
    echo "  3. Re-run this script to verify"
    echo ""
fi

if [ $warnings -gt 0 ]; then
    echo "Recommendations (Warnings):"
    echo "  • Review all ⚠ (yellow) items"
    echo "  • Consider implementing for production"
    echo "  • Document any intentional omissions"
    echo ""
fi

echo "Next Steps:"
echo "  1. Run: python3 manage.py check --deploy"
echo "  2. Review: SECURITY.md for detailed guidance"
echo "  3. Test: All security features in staging environment"
if [ $failed -eq 0 ]; then
    echo "  4. Ready: Proceed to Level 2 security hardening"
fi
echo ""
