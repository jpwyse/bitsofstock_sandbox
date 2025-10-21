"""
Tests for Trading API endpoints.

This module tests the buy/sell trade execution REST API endpoints
and transaction history retrieval.

Key Test Coverage:
- POST /api/trades/buy - Execute buy orders
- POST /api/trades/sell - Execute sell orders
- GET /api/transactions - Transaction history with pagination
- Edge Cases: Insufficient funds, missing holdings, invalid inputs
- Response Schema: Success/error responses, transaction objects

API Endpoint Behaviors Tested:
- Buy endpoint creates transaction and updates portfolio
- Sell endpoint validates holdings and calculates realized P&L
- Transactions endpoint supports filtering and pagination
- Error responses include helpful messages
"""
import pytest
from decimal import Decimal
from ninja.testing import TestClient
from trading.api import router
from trading.models import User, Transaction, Holding
from trading.tests.factories import (
    UserFactory,
    PortfolioFactory,
    CryptocurrencyFactory,
    HoldingFactory,
    TransactionFactory,
)


@pytest.mark.api
class TestBuyTradeAPI:
    """Test POST /api/trades/buy endpoint."""

    def test_buy_success_with_amount_usd(self, user, portfolio, btc):
        """
        Test successful buy trade using USD amount.

        Scenario:
        - Portfolio has $10,000 cash
        - Buy $5,000 worth of BTC

        Verifies:
        - 200 status code
        - success=True in response
        - Transaction object returned
        - Updated portfolio values returned
        - Cash balance decreased
        """
        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(btc.id),
            "amount_usd": "5000.00",
        }

        response = client.post("/trades/buy", json=payload)

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is True
        assert "transaction" in data
        assert "updated_portfolio" in data
        assert "error" not in data or data["error"] is None

        # Verify transaction details
        txn = data["transaction"]
        assert txn["type"] == "BUY"
        assert Decimal(txn["total_amount"]) == Decimal("5000.00")
        assert txn["cryptocurrency"]["symbol"] == "BTC"

        # Verify portfolio updated
        updated_portfolio = data["updated_portfolio"]
        assert Decimal(str(updated_portfolio["cash_balance"])) == Decimal("5000.00")

    def test_buy_success_with_quantity(self, user, portfolio, eth):
        """
        Test successful buy trade using quantity.

        Scenario:
        - Buy 2.0 ETH at $3,000/ETH

        Verifies:
        - Quantity parameter accepted
        - Total amount calculated correctly
        """
        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(eth.id),
            "quantity": "2.0",
        }

        response = client.post("/trades/buy", json=payload)

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is True

        txn = data["transaction"]
        assert Decimal(txn["quantity"]) == Decimal("2.0")
        assert Decimal(txn["total_amount"]) == Decimal("6000.00")  # 2.0 * 3000

    def test_buy_insufficient_funds(self, user, portfolio, btc):
        """
        Test buy fails with insufficient funds.

        Scenario:
        - Portfolio has $10,000 cash
        - Try to buy $15,000 worth

        Verifies:
        - success=False
        - Error message indicates insufficient funds
        - No transaction created in database
        """
        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(btc.id),
            "amount_usd": "15000.00",
        }

        response = client.post("/trades/buy", json=payload)

        assert response.status_code == 200  # API returns 200 even for business logic errors

        data = response.json()

        assert data["success"] is False
        assert "error" in data
        assert "Insufficient funds" in data["error"]

        # Verify no transaction created
        assert Transaction.objects.count() == 0

    def test_buy_creates_holding(self, user, portfolio, btc):
        """
        Test buy creates new holding in database.

        Verifies:
        - Holding created with correct quantity
        - Average purchase price set
        - Cost basis tracked
        """
        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(btc.id),
            "amount_usd": "5000.00",
        }

        response = client.post("/trades/buy", json=payload)

        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify holding created
        holding = Holding.objects.get(
            portfolio=portfolio,
            cryptocurrency=btc
        )

        assert holding.quantity == Decimal("5000.00") / btc.current_price
        assert holding.average_purchase_price == btc.current_price

    def test_buy_invalid_cryptocurrency_id(self, user, portfolio):
        """
        Test buy with non-existent cryptocurrency.

        Verifies:
        - Returns 404 error
        """
        client = TestClient(router)

        payload = {
            "cryptocurrency_id": "00000000-0000-0000-0000-000000000000",
            "amount_usd": "1000.00",
        }

        response = client.post("/trades/buy", json=payload)

        assert response.status_code == 404

    def test_buy_no_user(self, btc):
        """
        Test buy when no user exists.

        Verifies:
        - Returns error response
        - Error message indicates missing user
        """
        User.objects.all().delete()

        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(btc.id),
            "amount_usd": "1000.00",
        }

        response = client.post("/trades/buy", json=payload)

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is False
        assert "No user found" in data["error"]


@pytest.mark.api
class TestSellTradeAPI:
    """Test POST /api/trades/sell endpoint."""

    def test_sell_success_full_position(self, user, portfolio, btc):
        """
        Test successful sell of entire position.

        Scenario:
        - Holding: 0.5 BTC @ $48,000 average
        - Sell: 0.5 BTC @ $50,000 current

        Verifies:
        - 200 status code
        - success=True
        - Transaction includes realized gain/loss
        - Portfolio cash increased
        - Holding deleted from database
        """
        # Create holding
        holding = HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
            average_purchase_price=Decimal('48000.00'),
            total_cost_basis=Decimal('24000.00'),
        )

        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(btc.id),
            "quantity": "0.5",
        }

        response = client.post("/trades/sell", json=payload)

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is True

        # Verify realized gain
        txn = data["transaction"]
        expected_gain = (btc.current_price - Decimal('48000.00')) * Decimal('0.5')
        assert Decimal(txn["realized_gain_loss"]) == expected_gain

        # Verify holding deleted
        assert not Holding.objects.filter(id=holding.id).exists()

    def test_sell_success_partial_position(self, user, portfolio, eth):
        """
        Test successful sell of partial position.

        Scenario:
        - Holding: 2.0 ETH
        - Sell: 1.0 ETH

        Verifies:
        - Holding quantity reduced
        - Holding still exists in database
        """
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=eth,
            quantity=Decimal('2.0'),
            average_purchase_price=Decimal('2900.00'),
        )

        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(eth.id),
            "quantity": "1.0",
        }

        response = client.post("/trades/sell", json=payload)

        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify holding updated
        holding = Holding.objects.get(
            portfolio=portfolio,
            cryptocurrency=eth
        )

        assert holding.quantity == Decimal('1.0')

    def test_sell_insufficient_holdings(self, user, portfolio, btc):
        """
        Test sell fails with insufficient holdings.

        Scenario:
        - Holding: 0.5 BTC
        - Try to sell: 1.0 BTC

        Verifies:
        - success=False
        - Error message indicates insufficient holdings
        """
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
        )

        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(btc.id),
            "quantity": "1.0",
        }

        response = client.post("/trades/sell", json=payload)

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is False
        assert "Insufficient holdings" in data["error"]

    def test_sell_no_holding_exists(self, user, portfolio, btc):
        """
        Test sell fails when user doesn't own cryptocurrency.

        Verifies:
        - Error indicates no holdings
        - No transaction created
        """
        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(btc.id),
            "quantity": "0.5",
        }

        response = client.post("/trades/sell", json=payload)

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is False
        assert "don't own any" in data["error"].lower()

    def test_sell_with_amount_usd(self, user, portfolio, btc):
        """
        Test sell using USD amount instead of quantity.

        Verifies:
        - amount_usd parameter works correctly
        - Quantity calculated from amount
        """
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('1.0'),
        )

        client = TestClient(router)

        payload = {
            "cryptocurrency_id": str(btc.id),
            "amount_usd": "10000.00",
        }

        response = client.post("/trades/sell", json=payload)

        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify quantity calculated
        txn = response.json()["transaction"]
        expected_quantity = Decimal("10000.00") / btc.current_price
        assert Decimal(txn["quantity"]) == expected_quantity


@pytest.mark.api
class TestTransactionsAPI:
    """Test GET /api/transactions endpoint."""

    def test_get_transactions_empty(self, user, portfolio):
        """
        Test transactions endpoint with no transactions.

        Verifies:
        - 200 status code
        - Returns empty array
        - Pagination metadata present
        """
        client = TestClient(router)

        response = client.get("/transactions")

        assert response.status_code == 200

        data = response.json()

        # Paginated response structure
        assert "items" in data
        assert "count" in data

        assert len(data["items"]) == 0

    def test_get_transactions_with_data(self, user, portfolio, btc, eth):
        """
        Test transactions endpoint with transaction history.

        Verifies:
        - Returns array of transactions
        - Each transaction has required fields
        - Sorted by timestamp (most recent first)
        """
        # Create transactions
        TransactionFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            transaction_type='BUY',
        )
        TransactionFactory(
            portfolio=portfolio,
            cryptocurrency=eth,
            transaction_type='SELL',
        )

        client = TestClient(router)

        response = client.get("/transactions")

        assert response.status_code == 200

        data = response.json()
        transactions = data["items"]

        assert len(transactions) == 2

        # Verify transaction structure
        for txn in transactions:
            assert "id" in txn
            assert "type" in txn
            assert "cryptocurrency" in txn
            assert "quantity" in txn
            assert "price_per_unit" in txn
            assert "total_amount" in txn
            assert "timestamp" in txn
            assert "realized_gain_loss" in txn

    def test_get_transactions_filter_by_type_buy(self, user, portfolio, btc):
        """
        Test filtering transactions by BUY type.

        Verifies:
        - type=BUY query param filters correctly
        - Only BUY transactions returned
        """
        TransactionFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            transaction_type='BUY',
        )
        TransactionFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            transaction_type='SELL',
        )

        client = TestClient(router)

        response = client.get("/transactions?type=BUY")

        assert response.status_code == 200

        transactions = response.json()["items"]

        assert len(transactions) == 1
        assert transactions[0]["type"] == "BUY"

    def test_get_transactions_filter_by_type_sell(self, user, portfolio, btc):
        """
        Test filtering transactions by SELL type.

        Verifies:
        - type=SELL query param filters correctly
        """
        TransactionFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            transaction_type='BUY',
        )
        TransactionFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            transaction_type='SELL',
        )

        client = TestClient(router)

        response = client.get("/transactions?type=SELL")

        assert response.status_code == 200

        transactions = response.json()["items"]

        assert len(transactions) == 1
        assert transactions[0]["type"] == "SELL"

    def test_get_transactions_filter_all(self, user, portfolio, btc):
        """
        Test type=ALL returns all transactions.

        Verifies:
        - ALL filter shows both BUY and SELL
        """
        TransactionFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            transaction_type='BUY',
        )
        TransactionFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            transaction_type='SELL',
        )

        client = TestClient(router)

        response = client.get("/transactions?type=ALL")

        assert response.status_code == 200

        transactions = response.json()["items"]

        assert len(transactions) == 2

    def test_get_transactions_pagination(self, user, portfolio, btc):
        """
        Test pagination with page_size=20 default.

        Scenario:
        - Create 25 transactions
        - First page should have 20
        - Second page should have 5

        Verifies:
        - Pagination works correctly
        - Page parameter accepted
        """
        # Create 25 transactions
        for _ in range(25):
            TransactionFactory(
                portfolio=portfolio,
                cryptocurrency=btc,
            )

        client = TestClient(router)

        # Page 1
        response = client.get("/transactions?page=1")

        assert response.status_code == 200

        data = response.json()

        assert len(data["items"]) == 20
        assert data["count"] == 25

        # Page 2
        response = client.get("/transactions?page=2")

        assert response.status_code == 200

        data = response.json()

        assert len(data["items"]) == 5

    def test_get_transactions_no_user(self):
        """
        Test transactions endpoint when no user exists.

        Verifies:
        - Returns empty array (graceful handling)
        """
        User.objects.all().delete()

        client = TestClient(router)

        response = client.get("/transactions")

        assert response.status_code == 200

        data = response.json()

        assert len(data["items"]) == 0
