.PHONY: test test-pytest test-django test-frontend

# Run pytest across backend suite (includes tests_*.py via pytest.ini)
test-pytest:
	cd backend && pytest

# Run frontend unit/integration tests
test-frontend:
	cd frontend && npm test -- --runInBand

# Default target runs both test suites for complete coverage
test: test-pytest test-django test-frontend
