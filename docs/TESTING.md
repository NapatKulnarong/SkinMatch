# Testing Documentation

This document provides comprehensive information about testing in the SkinMatch project, including how to run tests, write new tests, and understand the testing infrastructure.

## Table of Contents

- [Overview](#overview)
- [Backend Testing](#backend-testing)
  - [Running Tests](#running-backend-tests)
  - [Test Structure](#backend-test-structure)
  - [Writing Tests](#writing-backend-tests)
- [Frontend Testing](#frontend-testing)
  - [Running Tests](#running-frontend-tests)
  - [Test Structure](#frontend-test-structure)
  - [Writing Tests](#writing-frontend-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

SkinMatch uses a comprehensive testing strategy with separate test suites for backend and frontend:

- **Backend**: Django with pytest and pytest-django
- **Frontend**: Next.js with Jest and React Testing Library
- **E2E Testing**: Playwright (optional, for end-to-end scenarios)

All tests are automatically run in CI/CD pipelines on push and pull requests.

---

## Backend Testing

### Running Backend Tests

#### Prerequisites

Ensure you have all dependencies installed:

```bash
cd backend
pip install -r requirements.txt
```

#### Running All Tests

**Using Django's test runner:**

```bash
cd backend
python manage.py test
```

**Run specific app tests:**

```bash
python manage.py test core
python manage.py test quiz
```

**Run with verbose output:**

```bash
python manage.py test core -v 2
```

**Using pytest (recommended):**

```bash
cd backend
pytest
```

**Run specific test file:**

```bash
pytest core/tests/tests_auth.py
```

**Run specific test class:**

```bash
pytest core/tests/tests_auth.py::EmailAuthTest
```

**Run specific test method:**

```bash
pytest core/tests/tests_auth.py::EmailAuthTest::test_login_with_valid_credentials
```

**Run with coverage:**

```bash
pip install pytest-cov
pytest --cov=core --cov=quiz --cov-report=html
```

#### Test Configuration

Backend tests use `pytest.ini` for configuration:

- **Django Settings**: `DJANGO_SETTINGS_MODULE = apidemo.settings`
- **Test File Pattern**: `test_*.py`

### Backend Test Structure

Tests are organized by Django app:

```
backend/
├── core/
│   └── tests/
│       ├── __init__.py
│       ├── test_newsletter.py
│       ├── tests_auth.py
│       ├── tests_feedback_highlights.py
│       ├── tests_feedback_system.py
│       ├── tests_ingredient_search.py
│       ├── tests_quiz_edge_cases.py
│       ├── tests_quiz_flow.py
│       ├── tests_quiz_history.py
│       ├── tests_recommendation.py
│       ├── tests_search_suggestion.py
│       ├── tests_skin_fact_model.py
│       ├── tests_skin_fact.py
│       └── tests_user_profile.py
└── quiz/
    └── tests/
        ├── __init__.py
        └── test_catalog.py
```

### Writing Backend Tests

#### Basic Test Structure

Backend tests use Django's `TestCase` class:

```python
from django.test import TestCase
from django.contrib.auth import get_user_model

class MyFeatureTest(TestCase):
    """Test suite for MyFeature"""

    @classmethod
    def setUpTestData(cls):
        """Set up test data once for the entire test class"""
        cls.User = get_user_model()
        cls.user = cls.User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )

    def setUp(self):
        """Set up before each test method"""
        self.client.login(username="testuser", password="testpass123")

    def test_feature_works_correctly(self):
        """Test that feature works as expected"""
        response = self.client.get("/api/my-endpoint/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("expected_key", data)
```

#### API Testing Example

```python
from django.test import TestCase
import json

class APITest(TestCase):
    def test_post_endpoint(self):
        payload = {"email": "user@example.com", "source": "homepage"}
        response = self.client.post(
            "/api/newsletter/subscribe",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
```

#### Model Testing Example

```python
from django.test import TestCase
from core.models import NewsletterSubscriber

class NewsletterModelTest(TestCase):
    def test_create_subscriber(self):
        subscriber = NewsletterSubscriber.objects.create(
            email="test@example.com",
            source="homepage"
        )
        self.assertEqual(subscriber.email, "test@example.com")
        self.assertTrue(subscriber.is_active)
```

#### Using Test Settings

For tests that need specific Django settings:

```python
from django.test import TestCase
from django.test.utils import override_settings

@override_settings(
    ACCOUNT_EMAIL_VERIFICATION="none",
    ACCOUNT_AUTHENTICATION_METHOD="email",
)
class EmailAuthTest(TestCase):
    # Your tests here
    pass
```

#### Database Setup

Django automatically creates a test database for each test run. The database is:

- Created fresh for each test run
- Destroyed after tests complete
- Isolated from your development database

---

## Frontend Testing

### Running Frontend Tests

#### Prerequisites

Ensure dependencies are installed:

```bash
cd frontend
npm install
```

#### Running All Tests

```bash
cd frontend
npm test
```

**Run in watch mode (recommended for development):**

```bash
npm run test:watch
```

**Run with coverage:**

```bash
npm test -- --coverage
```

**Run specific test file:**

```bash
npm test -- FactTopic.test.tsx
```

**Run tests matching a pattern:**

```bash
npm test -- --testNamePattern="renders hero image"
```

#### E2E Tests (Playwright)

```bash
npm run test:e2e
```

**Run E2E tests in UI mode:**

```bash
npx playwright test --ui
```

### Frontend Test Structure

Frontend tests are co-located with components in `__test__` directories:

```
frontend/src/
├── app/
│   ├── facts/
│   │   └── __test__/
│   │       ├── FactTopic.test.tsx
│   │       ├── FactCheck.test.tsx
│   │       ├── PopularTopic.test.tsx
│   │       └── SkinKnowledge.test.tsx
│   ├── login/
│   │   └── __test__/
│   │       ├── AdminLogin.test.tsx
│   │       ├── InfoForm.test.tsx
│   │       └── SignupForm.test.tsx
│   └── quiz/
│       └── result/
│           └── __test__/
│               └── page.test.tsx
```

### Writing Frontend Tests

#### Test Configuration

Jest configuration is in `jest.config.ts`:

- **Environment**: `jsdom` (simulates browser environment)
- **Setup**: `jest.setup.ts` (includes jest-dom matchers)
- **Path Aliases**: `@/` maps to `src/`

#### Basic Test Structure

```typescript
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MyComponent from "@/app/my-component";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

#### Mocking API Calls

```typescript
import { fetchFactTopicDetail } from "@/lib/api.facts";

jest.mock("@/lib/api.facts");

const mockedFetch = fetchFactTopicDetail as jest.MockedFunction<
  typeof fetchFactTopicDetail
>;

describe("Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and displays data", async () => {
    mockedFetch.mockResolvedValue({
      id: "1",
      title: "Test Topic",
      // ... other fields
    });

    render(<MyComponent />);

    await screen.findByText("Test Topic");
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});
```

#### Mocking Next.js Components

```typescript
import type { ComponentProps } from "react";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: ComponentProps<"img">) => {
    const { priority, fill, alt, ...rest } = props;
    void priority;
    void fill;
    return <img alt={alt ?? ""} {...rest} />;
  },
}));
```

#### Testing User Interactions

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("handles user input", async () => {
  const user = userEvent.setup();
  render(<FormComponent />);

  const input = screen.getByLabelText("Email");
  await user.type(input, "test@example.com");

  expect(input).toHaveValue("test@example.com");
});
```

#### Testing Async Components

```typescript
import { render, screen, waitFor } from "@testing-library/react";

it("renders async content", async () => {
  render(<AsyncComponent />);

  // Wait for async content to appear
  await waitFor(() => {
    expect(screen.getByText("Loaded content")).toBeInTheDocument();
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:

- Push to `main`, `experiment/**`, or `feature/**` branches
- Pull requests to `main` or `experiment/**` branches

### Backend CI Pipeline

The backend CI pipeline:

1. Sets up PostgreSQL service
2. Installs Python dependencies
3. Runs database migrations
4. Runs unit tests: `python manage.py test core -v 2`
5. Runs security scan (Bandit)
6. Runs dependency audit (pip-audit)

**Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string
- `DJANGO_SECRET_KEY`: Dummy key for testing
- `DJANGO_DEBUG`: `False`
- `GOOGLE_TEST_MODE`: `1` (for Google auth mocking)
- `SITE_ID`: `2`

### Frontend CI Pipeline

The frontend CI pipeline:

1. Installs Node.js dependencies
2. Runs linting: `npm run lint`
3. Builds the application: `npm run build`
4. Runs E2E tests: `npm run test:e2e` (Playwright)

**Note**: E2E tests are set to not fail the build if they error (for CI preview purposes).

---

## Best Practices

### General Testing Principles

1. **Test Behavior, Not Implementation**

   - Focus on what the code does, not how it does it
   - Tests should remain valid even if implementation changes

2. **Use Descriptive Test Names**

   ```python
   # Good
   def test_creates_new_subscriber_with_valid_email(self):

   # Bad
   def test_subscriber(self):
   ```

3. **Arrange-Act-Assert Pattern**

   - **Arrange**: Set up test data and conditions
   - **Act**: Execute the code being tested
   - **Assert**: Verify the expected outcome

4. **Keep Tests Independent**

   - Each test should be able to run in isolation
   - Don't rely on test execution order
   - Clean up after tests (use `setUp`/`tearDown` or `beforeEach`/`afterEach`)

5. **Test Edge Cases**
   - Boundary conditions
   - Error cases
   - Empty/null inputs
   - Invalid inputs

### Backend Specific

1. **Use `setUpTestData` for Class-Level Data**

   ```python
   @classmethod
   def setUpTestData(cls):
       # Runs once per test class
       cls.user = User.objects.create_user(...)
   ```

2. **Use `setUp` for Per-Test Setup**

   ```python
   def setUp(self):
       # Runs before each test method
       self.client.login(...)
   ```

3. **Use Factories for Complex Objects**

   - Consider using `factory_boy` or similar for complex test data

4. **Mock External Services**
   - Mock API calls to external services
   - Use `override_settings` for Django settings

### Frontend Specific

1. **Test User-Centric Behavior**

   - Test what users see and interact with
   - Use `getByRole`, `getByLabelText` over `getByTestId`

2. **Clean Up Mocks**

   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

3. **Use Accessible Queries**

   ```typescript
   // Good - accessible
   screen.getByRole("button", { name: "Submit" });

   // Less ideal - implementation detail
   screen.getByTestId("submit-button");
   ```

4. **Test Accessibility**
   - Ensure components are accessible
   - Test keyboard navigation
   - Test screen reader compatibility

---

## Troubleshooting

### Backend Issues

**Problem**: Tests fail with database errors

- **Solution**: Ensure migrations are up to date: `python manage.py migrate`
- **Solution**: Check that test database can be created (permissions)

**Problem**: Tests fail with authentication errors

- **Solution**: Ensure `SITE_ID` is set correctly in test settings
- **Solution**: Use `override_settings` for auth-related settings

**Problem**: Tests are slow

- **Solution**: Use `setUpTestData` instead of `setUp` for class-level data
- **Solution**: Consider using `pytest-django` with `--reuse-db` flag

### Frontend Issues

**Problem**: Tests fail with module not found errors

- **Solution**: Check path aliases in `jest.config.ts`
- **Solution**: Ensure `tsconfig.json` paths match Jest config

**Problem**: Tests fail with "window is not defined"

- **Solution**: Ensure `testEnvironment: 'jsdom'` in `jest.config.ts`
- **Solution**: Mock browser APIs if needed

**Problem**: Async tests timeout

- **Solution**: Increase timeout: `jest.setTimeout(10000)`
- **Solution**: Use `waitFor` or `findBy` queries from Testing Library

**Problem**: Mocking Next.js components fails

- **Solution**: Ensure mocks are placed before imports
- **Solution**: Check that mock structure matches actual component

### Common Commands

**Backend:**

```bash
# Run with verbose output to see what's happening
python manage.py test -v 2

# Run specific test to isolate issues
pytest core/tests/tests_auth.py::EmailAuthTest::test_login -v

# Check for test database issues
python manage.py test --keepdb
```

**Frontend:**

```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests in watch mode to see changes
npm run test:watch

# Clear Jest cache
npm test -- --clearCache
```

---

## Additional Resources

- [Django Testing Documentation](https://docs.djangoproject.com/en/stable/topics/testing/)
- [pytest-django Documentation](https://pytest-django.readthedocs.io/)
- [React Testing Library Documentation](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)

---

## Contributing

When adding new features:

1. **Write tests first** (TDD approach) or alongside implementation
2. **Ensure all tests pass** before submitting PR
3. **Add tests for edge cases** and error conditions
4. **Update this documentation** if adding new testing patterns or tools

---

_Last updated: 2025_
