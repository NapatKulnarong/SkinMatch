.PHONY: test test-pytest test-frontend test-e2e

# Run pytest across backend suite (includes tests_*.py via pytest.ini)
test-pytest:
	cd backend && pytest

# Run frontend unit/integration tests
test-frontend:
	cd frontend && npm test -- --runInBand

# Run frontend end-to-end tests (Playwright)
test-e2e:
	cd frontend && npm run test:e2e

# Default target runs both test suites for complete coverage
test: test-pytest test-frontend test-e2e
