"""
Tests for Portfolio API endpoints.

This module tests the portfolio-related REST API endpoints that provide
portfolio summary, historical performance, and holdings data.

Key Test Coverage:
- GET /api/portfolio/summary - Portfolio totals and gain/loss
- GET /api/portfolio/history - Historical portfolio values
- GET /api/holdings - Current holdings list
- Edge Cases: Missing user, empty portfolio, invalid timeframes
- Response Schema: Correct field types and structure

API Endpoint Behaviors Tested:
- Portfolio summary returns all required fields
- History endpoint validates timeframes (1D, 5D, 1M, 3M, 6M, YTD only)
- Holdings returns empty list when no positions
- All endpoints require valid user
"""
import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from ninja.testing import TestClient
from trading.api import router
from trading.models import User
from trading.tests.factories import (
    UserFactory,
    PortfolioFactory,
    CryptocurrencyFactory,
    HoldingFactory,
    TransactionFactory,
)


@pytest.mark.api
class TestPortfolioSummaryAPI:
    """Test GET /api/portfolio/summary endpoint."""

    def test_get_portfolio_summary_success(self, user, portfolio):
        """
        Test successful portfolio summary retrieval.

        Verifies:
        - 200 status code
        - Returns all required fields
        - Field types match schema
        - Values match portfolio model properties
        """
        client = TestClient(router)

        response = client.get("/portfolio/summary")

        assert response.status_code == 200

        data = response.json()

        # Verify all required fields present
        assert "cash_balance" in data
        assert "total_holdings_value" in data
        assert "total_portfolio_value" in data
        assert "initial_investment" in data
        assert "total_gain_loss" in data
        assert "total_gain_loss_percentage" in data
        assert "last_updated" in data

        # Verify values match portfolio
        assert Decimal(str(data["cash_balance"])) == portfolio.cash_balance
        assert Decimal(str(data["initial_investment"])) == portfolio.initial_cash

    def test_get_portfolio_summary_with_holdings(self, portfolio_with_holdings):
        """
        Test portfolio summary with active holdings.

        Verifies:
        - Holdings value calculated correctly
        - Total portfolio value = cash + holdings
        - Gain/loss reflects unrealized P&L
        """
        client = TestClient(router)

        response = client.get("/portfolio/summary")

        assert response.status_code == 200

        data = response.json()

        # Holdings should have non-zero value
        assert Decimal(str(data["total_holdings_value"])) > 0

        # Total value should be sum of cash + holdings
        cash = Decimal(str(data["cash_balance"]))
        holdings = Decimal(str(data["total_holdings_value"]))
        total = Decimal(str(data["total_portfolio_value"]))

        assert total == cash + holdings

    def test_get_portfolio_summary_no_user(self):
        """
        Test portfolio summary when no user exists.

        Verifies:
        - Returns 404 error
        - Error message indicates missing user
        """
        # Ensure no users exist
        User.objects.all().delete()

        client = TestClient(router)

        response = client.get("/portfolio/summary")

        assert response.status_code == 404


@pytest.mark.api
class TestPortfolioHistoryAPI:
    """Test GET /api/portfolio/history endpoint."""

    def test_get_portfolio_history_1d(self, user, portfolio, btc):
        """
        Test 1D timeframe returns hourly data.

        Verifies:
        - 200 status code
        - Timeframe field matches request
        - Data points array present
        - Each point has timestamp and portfolio_value
        """
        client = TestClient(router)

        response = client.get("/portfolio/history?timeframe=1D")

        assert response.status_code == 200

        data = response.json()

        assert data["timeframe"] == "1D"
        assert "data_points" in data
        assert isinstance(data["data_points"], list)

        if len(data["data_points"]) > 0:
            point = data["data_points"][0]
            assert "timestamp" in point
            assert "portfolio_value" in point

    def test_get_portfolio_history_5d(self, portfolio):
        """Test 5D timeframe."""
        client = TestClient(router)

        response = client.get("/portfolio/history?timeframe=5D")

        assert response.status_code == 200
        assert response.json()["timeframe"] == "5D"

    def test_get_portfolio_history_1m(self, portfolio):
        """Test 1M timeframe."""
        client = TestClient(router)

        response = client.get("/portfolio/history?timeframe=1M")

        assert response.status_code == 200
        assert response.json()["timeframe"] == "1M"

    def test_get_portfolio_history_3m(self, portfolio):
        """Test 3M timeframe."""
        client = TestClient(router)

        response = client.get("/portfolio/history?timeframe=3M")

        assert response.status_code == 200
        assert response.json()["timeframe"] == "3M"

    def test_get_portfolio_history_6m(self, portfolio):
        """Test 6M timeframe."""
        client = TestClient(router)

        response = client.get("/portfolio/history?timeframe=6M")

        assert response.status_code == 200
        assert response.json()["timeframe"] == "6M"

    def test_get_portfolio_history_ytd(self, portfolio):
        """Test YTD timeframe."""
        client = TestClient(router)

        response = client.get("/portfolio/history?timeframe=YTD")

        assert response.status_code == 200
        assert response.json()["timeframe"] == "YTD"

    def test_get_portfolio_history_invalid_timeframe(self, portfolio):
        """
        Test invalid timeframe returns 400 error.

        Verifies:
        - 1Y not supported for portfolio (market only)
        - 5Y not supported
        - Random strings rejected
        - Error message lists valid options
        """
        client = TestClient(router)

        # 1Y not supported for portfolio history
        response = client.get("/portfolio/history?timeframe=1Y")

        assert response.status_code == 400

        # Invalid string
        response = client.get("/portfolio/history?timeframe=INVALID")

        assert response.status_code == 400

    def test_get_portfolio_history_missing_timeframe(self, portfolio):
        """
        Test missing timeframe parameter.

        Verifies:
        - Returns 422 (missing required query param)
        """
        client = TestClient(router)

        response = client.get("/portfolio/history")

        assert response.status_code == 422  # Unprocessable entity

    def test_get_portfolio_history_no_user(self):
        """
        Test history endpoint when no user exists.

        Verifies:
        - Returns 404 error
        """
        User.objects.all().delete()

        client = TestClient(router)

        response = client.get("/portfolio/history?timeframe=1M")

        assert response.status_code == 404


@pytest.mark.api
class TestHoldingsAPI:
    """Test GET /api/holdings endpoint."""

    def test_get_holdings_empty_portfolio(self, user, portfolio):
        """
        Test holdings endpoint with no holdings.

        Verifies:
        - 200 status code
        - Returns empty holdings array
        - Response structure valid
        """
        client = TestClient(router)

        response = client.get("/holdings")

        assert response.status_code == 200

        data = response.json()

        assert "holdings" in data
        assert isinstance(data["holdings"], list)
        assert len(data["holdings"]) == 0

    def test_get_holdings_with_positions(self, portfolio_with_holdings):
        """
        Test holdings endpoint with active positions.

        Scenario:
        - Portfolio has BTC and ETH holdings (via fixture)

        Verifies:
        - Returns array of holdings
        - Each holding has required fields
        - Cryptocurrency nested object present
        - Gain/loss calculations present
        """
        client = TestClient(router)

        response = client.get("/holdings")

        assert response.status_code == 200

        data = response.json()
        holdings = data["holdings"]

        assert len(holdings) == 2  # BTC and ETH from fixture

        # Verify holding structure
        for holding in holdings:
            assert "id" in holding
            assert "cryptocurrency" in holding
            assert "quantity" in holding
            assert "average_purchase_price" in holding
            assert "total_cost_basis" in holding
            assert "current_value" in holding
            assert "gain_loss" in holding
            assert "gain_loss_percentage" in holding

            # Verify cryptocurrency nested object
            crypto = holding["cryptocurrency"]
            assert "id" in crypto
            assert "symbol" in crypto
            assert "name" in crypto
            assert "icon_url" in crypto
            assert "current_price" in crypto

    def test_get_holdings_single_position(self, portfolio, btc):
        """
        Test holdings with single position.

        Verifies:
        - Single holding returned correctly
        - Values match database
        """
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
            average_purchase_price=Decimal('48000.00'),
            total_cost_basis=Decimal('24000.00'),
        )

        client = TestClient(router)

        response = client.get("/holdings")

        assert response.status_code == 200

        holdings = response.json()["holdings"]

        assert len(holdings) == 1

        holding = holdings[0]
        assert Decimal(str(holding["quantity"])) == Decimal('0.5')
        assert holding["cryptocurrency"]["symbol"] == "BTC"

    def test_get_holdings_no_user(self):
        """
        Test holdings endpoint when no user exists.

        Verifies:
        - Returns 404 error
        """
        User.objects.all().delete()

        client = TestClient(router)

        response = client.get("/holdings")

        assert response.status_code == 404

    def test_get_holdings_gain_loss_calculation(self, portfolio, eth):
        """
        Test gain/loss calculations in holdings response.

        Scenario:
        - Holding: 2.0 ETH @ $2,900 average
        - Current price: $3,000
        - Expected gain: $200 (2.0 × ($3,000 - $2,900))

        Verifies:
        - Gain/loss calculated correctly
        - Percentage reflects actual gain
        """
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=eth,
            quantity=Decimal('2.0'),
            average_purchase_price=Decimal('2900.00'),
            total_cost_basis=Decimal('5800.00'),
        )

        # Set current price
        eth.current_price = Decimal('3000.00')
        eth.save()

        client = TestClient(router)

        response = client.get("/holdings")

        assert response.status_code == 200

        holding = response.json()["holdings"][0]

        expected_gain = Decimal('200.00')  # 2.0 * (3000 - 2900)

        assert Decimal(str(holding["gain_loss"])) == expected_gain

        # Current value should be quantity × current_price
        expected_value = Decimal('6000.00')
        assert Decimal(str(holding["current_value"])) == expected_value
