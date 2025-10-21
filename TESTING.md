# Testing Guide - Crypto Trading Sandbox

Comprehensive testing documentation for the Crypto Trading Sandbox V1 MVP.

## Table of Contents

1. [Overview](#overview)
2. [Test Suite Structure](#test-suite-structure)
3. [Running Tests](#running-tests)
4. [Backend Tests](#backend-tests)
5. [Frontend Tests](#frontend-tests)
6. [E2E Tests](#e2e-tests)
7. [Coverage Requirements](#coverage-requirements)
8. [CI/CD Integration](#cicd-integration)
9. [Writing New Tests](#writing-new-tests)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This project uses a three-tier testing strategy:

- **Backend**: pytest + factory-boy + freezegun + responses
- **Frontend**: React Testing Library + Jest
- **E2E**: Playwright (Chromium only, 1 smoke test)

### Testing Philosophy

- **Fast**: Full test suite runs in <5 minutes
- **Reliable**: Deterministic tests with frozen time and mocked external APIs
- **Comprehensive**: 80%+ backend coverage, 65%+ frontend coverage
- **Documented**: All tests include docstrings explaining purpose and edge cases

---

## Test Suite Structure

```
crypto_trading_sandbox/
├── trading/tests/              # Backend tests (pytest)
│   ├── conftest.py            # Shared fixtures
│   ├── factories.py           # Factory Boy factories
│   ├── test_services_portfolio.py
│   ├── test_services_trading.py
│   ├── test_api_portfolio.py
│   ├── test_api_trading.py
│   ├── test_api_cryptocurrencies.py
│   ├── test_api_news.py
│   └── test_api_market.py
├── frontend/src/               # Frontend tests (Jest + RTL)
│   ├── setupTests.js          # Global test configuration
│   ├── utils/testUtils.js     # Custom render functions
│   ├── __mocks__/api.js       # Mock API service
│   ├── components/
│   │   ├── TradeModal.test.js
│   │   └── news/NewsCard.test.js
│   └── ...
├── e2e/                        # E2E tests (Playwright)
│   ├── playwright.config.js
│   ├── package.json
│   └── tests/
│       └── buy-flow.spec.js
└── pytest.ini                  # Pytest configuration
```

---

## Running Tests

### Backend Tests (pytest)

```bash
# Run all backend tests
pytest

# Run with coverage report
pytest --cov=trading --cov-report=html --cov-report=term-missing

# Run specific test file
pytest trading/tests/test_services_portfolio.py

# Run specific test
pytest trading/tests/test_services_trading.py::TestTradingServiceBuy::test_buy_success_with_amount_usd

# Run tests with markers
pytest -m unit          # Unit tests only
pytest -m api           # API tests only
pytest -m integration   # Integration tests only

# Verbose output
pytest -v

# Stop on first failure
pytest -x

# Run in parallel (faster)
pytest -n auto
```

### Frontend Tests (Jest)

```bash
cd frontend

# Run all tests
npm test

# Run tests once (no watch mode)
npm test -- --watchAll=false

# Run with coverage
npm test -- --coverage --watchAll=false

# Run specific test file
npm test -- NewsCard.test.js

# Run in watch mode (default)
npm test
```

### E2E Tests (Playwright)

```bash
cd e2e

# Install Playwright browsers (first time only)
npm install
npm run install-browsers

# Run E2E tests (headless)
npm test

# Run with browser visible
npm test:headed

# Debug mode
npm test:debug

# Interactive UI mode
npm test:ui

# View last test report
npm run report
```

### Run All Tests

```bash
# From project root
./run_all_tests.sh    # Creates this script below
```

Create `run_all_tests.sh`:

```bash
#!/bin/bash
set -e

echo "Running backend tests..."
pytest --cov=trading --cov-report=term-missing --no-cov-on-fail

echo "Running frontend tests..."
cd frontend && npm test -- --coverage --watchAll=false && cd ..

echo "Running E2E tests..."
cd e2e && npm test && cd ..

echo "All tests passed!"
```

---

## Backend Tests

### Technology Stack

- **pytest**: Test runner
- **pytest-django**: Django integration
- **factory-boy**: Test data factories
- **freezegun**: Time freezing for deterministic tests
- **responses**: HTTP request mocking

### Test Categories

#### 1. Service Tests (`test_services_*.py`)

Test business logic in isolation:

- `test_services_portfolio.py`: Portfolio calculations, history generation
- `test_services_trading.py`: Buy/sell execution, holdings management

**Example:**

```python
def test_buy_success_with_amount_usd(self, portfolio, btc):
    """
    Test successful buy order using USD amount.

    Verifies:
    - Cash deducted correctly
    - Holding created with correct quantity
    - Average purchase price set
    """
    initial_cash = portfolio.cash_balance
    amount_usd = Decimal('5000.00')

    success, txn, error = TradingService.execute_buy(
        portfolio=portfolio,
        cryptocurrency=btc,
        amount_usd=amount_usd,
    )

    assert success is True
    assert txn is not None
```

#### 2. API Tests (`test_api_*.py`)

Test REST endpoints using Ninja TestClient:

- `test_api_portfolio.py`: Portfolio summary, history, holdings
- `test_api_trading.py`: Buy/sell trades, transactions
- `test_api_cryptocurrencies.py`: Crypto list, detail
- `test_api_news.py`: News articles
- `test_api_market.py`: Price history

**Example:**

```python
def test_get_portfolio_summary_success(self, user, portfolio):
    """Test successful portfolio summary retrieval."""
    client = TestClient(router)
    response = client.get("/portfolio/summary")

    assert response.status_code == 200
    assert "cash_balance" in response.json()
```

### Fixtures

Defined in `trading/tests/conftest.py`:

- `user`: Test user
- `portfolio`: Portfolio with $10k cash
- `portfolio_with_holdings`: Portfolio with BTC and ETH holdings
- `btc`, `eth`, `usdc`: Cryptocurrency fixtures
- `frozen_time`: Freeze time to 2025-01-15 12:00:00 UTC
- `mock_coingecko`, `mock_yfinance`, `mock_finnhub`: Mock external APIs

### Factories

Defined in `trading/tests/factories.py`:

- `UserFactory`: Create test users
- `PortfolioFactory`: Create portfolios
- `CryptocurrencyFactory`: Create cryptocurrencies
- `HoldingFactory`: Create holdings
- `TransactionFactory`: Create transactions
- `PriceHistoryFactory`: Create historical price data

### Running Specific Test Categories

```bash
pytest -m unit          # Unit tests
pytest -m api           # API tests
pytest -m integration   # Integration tests
pytest -m slow          # Slow tests
```

---

## Frontend Tests

### Technology Stack

- **Jest**: Test runner (included with Create React App)
- **React Testing Library**: Component testing
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom matchers

### Test Utilities

#### Custom Render Functions

Located in `frontend/src/utils/testUtils.js`:

```javascript
import { renderWithProviders } from '../utils/testUtils';

// Renders with Theme + Router + PortfolioContext
renderWithProviders(<MyComponent />, { withPortfolio: true });

// Renders with Theme only
renderWithTheme(<MyComponent />);
```

#### Mock API

Located in `frontend/src/__mocks__/api.js`:

```javascript
import api from '../services/api';
jest.mock('../services/api');

// Override mock in test
api.portfolioAPI.getSummary.mockResolvedValue({ data: { ... } });
```

### Test Structure

Each component test includes:

1. **Description**: What the component does
2. **Test Coverage**: Key features tested
3. **Behaviors Tested**: Specific user interactions

**Example:**

```javascript
describe('NewsCard', () => {
  it('renders article headline', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);
    expect(screen.getByText('Bitcoin Reaches New High')).toBeInTheDocument();
  });

  it('link opens in new tab with security attributes', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
```

### Component Test Coverage

- ✅ `TradeModal.test.js`: Buy/sell modal with validation
- ✅ `NewsCard.test.js`: News article display
- ✅ `PortfolioPerformanceChart.test.js`: Portfolio chart (existing)

### Best Practices

1. **Use semantic queries**: `getByRole`, `getByLabelText`, `getByText`
2. **Test user behavior**: Not implementation details
3. **Mock external dependencies**: API, WebSocket, context
4. **Cleanup**: RTL auto-cleans up between tests
5. **Accessibility**: Use ARIA roles and labels

---

## E2E Tests

### Technology Stack

- **Playwright**: Browser automation and testing
- **Chromium**: Single browser for fast execution
- **1 Smoke Test**: Critical happy path only

### Configuration

Located in `e2e/playwright.config.js`:

- **Timeout**: 60 seconds per test (requirement)
- **Retries**: 2 on CI, 0 locally
- **Workers**: 1 on CI (sequential), unlimited locally
- **Screenshots/Videos**: On failure only
- **Web Servers**: Auto-starts backend (Django) and frontend (React)

### Buy Flow Smoke Test

Located in `e2e/tests/buy-flow.spec.js`:

**Scenarios Tested:**

1. **Happy Path**: Complete successful purchase
   - Navigate to Market
   - Select Bitcoin
   - Enter $1000 amount
   - Submit trade
   - Verify success message
   - Verify holdings updated

2. **Error Handling**: Insufficient funds
   - Attempt to buy $1M (more than available)
   - Verify error message shown

3. **Cancel**: Close modal without trading
   - Open trade modal
   - Click Cancel
   - Verify modal closed

### Running E2E Tests

```bash
cd e2e

# Headless (CI mode)
npm test

# Headed (see browser)
npm test:headed

# Debug (step through)
npm test:debug

# UI mode (interactive)
npm test:ui
```

### E2E Test Requirements

- ✅ Runtime: <60 seconds
- ✅ Browser: Chromium only
- ✅ Count: 1 smoke test (Buy flow)
- ✅ Data: Uses demo user and portfolio
- ✅ Isolation: Each test resets state

---

## Coverage Requirements

### Backend Coverage Targets

| Category | Target | CI Fail Threshold |
|----------|--------|-------------------|
| Services | 85%    | 80%               |
| API      | 75%    | 80% (global)      |
| Overall  | 80%+   | 80%               |

### Frontend Coverage Targets

| Category   | Target | CI Fail Threshold |
|------------|--------|-------------------|
| Components | 70%    | 65%               |
| Utils      | 70%    | 65%               |
| Overall    | 70%    | 65%               |

### Viewing Coverage Reports

#### Backend

```bash
pytest --cov=trading --cov-report=html
open htmlcov/index.html
```

#### Frontend

```bash
cd frontend
npm test -- --coverage --watchAll=false
open coverage/lcov-report/index.html
```

### Coverage Exclusions

**Backend** (`pytest.ini`):

- `*/migrations/*`
- `*/tests/*`
- `*/__pycache__/*`
- `*/venv/*`

**Frontend** (Create React App default):

- `src/index.js`
- `src/reportWebVitals.js`
- `src/**/*.test.js`

---

## CI/CD Integration

### GitHub Actions Workflow

Located in `.github/workflows/test.yml` (to be created):

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest --cov=trading --cov-fail-under=80

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --coverage --watchAll=false
      - run: |
          COVERAGE=$(cat frontend/coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 65" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 65%"
            exit 1
          fi

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: cd e2e && npm ci
      - run: cd e2e && npx playwright install chromium
      - run: cd e2e && npm test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

### Pre-commit Hooks (Optional)

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml <<EOF
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        pass_filenames: false
        always_run: true
EOF

# Install hooks
pre-commit install
```

---

## Writing New Tests

### Backend Test Template

```python
"""
Tests for [Component Name].

This module tests [brief description].

Key Test Coverage:
- [Feature 1]
- [Feature 2]
- Edge Cases: [list]

Component Behaviors Tested:
- [Behavior 1]
- [Behavior 2]
"""
import pytest
from decimal import Decimal
from trading.tests.factories import UserFactory

@pytest.mark.unit
class TestComponentName:
    """Test [Component] functionality."""

    def test_feature_success(self, portfolio, btc):
        """
        Test successful [feature] execution.

        Verifies:
        - [Expected outcome 1]
        - [Expected outcome 2]
        """
        # Arrange
        initial_state = portfolio.cash_balance

        # Act
        result = perform_action(portfolio, btc)

        # Assert
        assert result.success is True
        assert portfolio.cash_balance == initial_state - amount
```

### Frontend Test Template

```javascript
/**
 * Tests for [ComponentName] component.
 *
 * Key Test Coverage:
 * - [Feature 1]
 * - [Feature 2]
 */

import { screen } from '@testing-library/react';
import { renderWithTheme } from '../utils/testUtils';
import ComponentName from './ComponentName';

describe('ComponentName', () => {
  const mockProps = {
    prop1: 'value1',
    prop2: 'value2',
  };

  it('renders component correctly', () => {
    renderWithTheme(<ComponentName {...mockProps} />);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ComponentName {...mockProps} />);

    const button = screen.getByRole('button', { name: /Click Me/i });
    await user.click(button);

    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

### E2E Test Template

```javascript
/**
 * E2E Test: [Flow Name]
 *
 * User Flow:
 * 1. [Step 1]
 * 2. [Step 2]
 * 3. [Step 3]
 */

const { test, expect } = require('@playwright/test');

test.describe('[Flow Name]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Expected Content');
  });

  test('should complete [flow] successfully', async ({ page }) => {
    // Step 1: [Description]
    await page.click('text=Button');

    // Step 2: [Description]
    await expect(page).toHaveURL(/\/expected-path/);

    // Step 3: [Description]
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

---

## Troubleshooting

### Common Issues

#### Backend Tests

**Issue**: `ImportError: No module named 'trading'`

**Solution**:
```bash
# Ensure you're in the project root
cd /path/to/crypto_trading_sandbox

# Install in development mode
pip install -e .
```

**Issue**: `django.core.exceptions.ImproperlyConfigured: Requested setting..., but settings are not configured`

**Solution**: Verify `DJANGO_SETTINGS_MODULE` in `pytest.ini`:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = backend.settings
```

**Issue**: Tests fail with frozen time

**Solution**: Use `frozen_time` fixture:
```python
def test_with_frozen_time(self, frozen_time, portfolio):
    # Time is frozen to 2025-01-15 12:00:00 UTC
    assert timezone.now() == frozen_time
```

#### Frontend Tests

**Issue**: `TypeError: Cannot read property 'useContext' of undefined`

**Solution**: Ensure components are wrapped with providers:
```javascript
import { renderWithProviders } from '../utils/testUtils';
renderWithProviders(<MyComponent />, { withPortfolio: true });
```

**Issue**: `Warning: An update to Component inside a test was not wrapped in act(...)`

**Solution**: Use `waitFor` for async updates:
```javascript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

**Issue**: `Cannot find module '../services/api'`

**Solution**: Ensure mock is in correct location:
```javascript
// frontend/src/__mocks__/api.js must exist
jest.mock('../services/api');
```

#### E2E Tests

**Issue**: `Error: page.goto: net::ERR_CONNECTION_REFUSED`

**Solution**: Ensure servers are running:
```bash
# Terminal 1: Backend
cd backend && python manage.py runserver

# Terminal 2: Frontend
cd frontend && npm start

# Terminal 3: E2E tests
cd e2e && npm test
```

**Issue**: Timeout waiting for element

**Solution**: Increase timeout or check selector:
```javascript
await page.waitForSelector('text=Content', { timeout: 10000 });
```

**Issue**: Tests pass locally but fail on CI

**Solution**: Use `fullyParallel: false` in `playwright.config.js` for CI:
```javascript
fullyParallel: !process.env.CI,
```

### Debug Mode

#### Backend

```bash
# Run pytest with pdb on failure
pytest --pdb

# Run specific test with verbose output
pytest -vv trading/tests/test_services_portfolio.py::TestPortfolioHistoryCalculation::test_portfolio_history_1d_timeframe
```

#### Frontend

```bash
# Run with debugging
npm test -- --no-cache --verbose
```

#### E2E

```bash
# Debug mode (step through)
cd e2e && npm run test:debug

# UI mode (interactive)
cd e2e && npm run test:ui
```

---

## Continuous Improvement

### Adding Coverage

1. Check current coverage: `pytest --cov=trading --cov-report=term-missing`
2. Identify uncovered lines
3. Write tests for critical paths first
4. Aim for 80%+ overall, 85%+ on services

### Test Maintenance

1. **Keep tests fast**: Mock external APIs
2. **Keep tests isolated**: Use factories, not shared state
3. **Keep tests readable**: Clear docstrings and assertions
4. **Keep tests updated**: Update when features change

### Metrics to Track

- Test count (goal: 100+ backend, 50+ frontend)
- Coverage percentage (goal: 80% backend, 70% frontend)
- Test execution time (goal: <5 minutes total)
- Flakiness rate (goal: <1%)

---

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [factory-boy documentation](https://factoryboy.readthedocs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright documentation](https://playwright.dev/)
- [Django Testing](https://docs.djangoproject.com/en/5.0/topics/testing/)

---

**Last Updated**: 2025-01-20
**Maintained By**: Development Team
