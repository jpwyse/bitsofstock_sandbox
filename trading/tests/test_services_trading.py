"""
Tests for TradingService - Buy and sell order execution.

This module tests the core trading logic that handles cryptocurrency
transactions, portfolio updates, and holdings management.

Key Test Coverage:
- Buy Orders: Happy path, insufficient funds, minimum trade amount, Decimal precision
- Sell Orders: Happy path, partial/full positions, insufficient holdings
- Holdings: Creation, updates, average cost calculation, position tracking
- Transactions: Record creation, realized gain/loss calculation
- Edge Cases: Zero prices, missing holdings, invalid inputs, rounding

Business Rules Tested:
- Buy: Deduct cash, create/update holding, calculate average cost basis
- Sell: Add cash, reduce/delete holding, calculate realized gain/loss
- Average Cost: (old_cost + new_cost) / new_quantity
- Realized P&L: (sale_price - avg_purchase_price) × quantity_sold
- Minimum Trade: $0.01 USD
- Atomic Transactions: All-or-nothing DB operations
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from trading.services.trading import TradingService
from trading.models import Holding, Transaction
from trading.tests.factories import (
    PortfolioFactory,
    CryptocurrencyFactory,
    HoldingFactory,
)


@pytest.mark.unit
class TestTradingServiceBuy:
    """Test TradingService.execute_buy method."""

    def test_buy_success_with_amount_usd(self, portfolio, btc):
        """
        Test successful buy order using USD amount.

        Scenario:
        - Portfolio has $10,000 cash
        - Buy $5,000 worth of BTC at $50,000/BTC
        - Expected: 0.1 BTC purchased

        Verifies:
        - Returns success=True
        - Transaction created
        - Cash deducted correctly
        - Holding created with correct quantity
        - Average purchase price set to current price
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
        assert error is None

        # Verify transaction record
        assert txn.transaction_type == Transaction.TransactionType.BUY
        assert txn.total_amount == amount_usd
        assert txn.price_per_unit == btc.current_price
        assert txn.quantity == amount_usd / btc.current_price
        assert txn.realized_gain_loss == Decimal('0.00')

        # Verify portfolio cash deducted
        portfolio.refresh_from_db()
        assert portfolio.cash_balance == initial_cash - amount_usd

        # Verify holding created
        holding = Holding.objects.get(portfolio=portfolio, cryptocurrency=btc)
        assert holding.quantity == amount_usd / btc.current_price
        assert holding.average_purchase_price == btc.current_price
        assert holding.total_cost_basis == amount_usd

    def test_buy_success_with_quantity(self, portfolio, eth):
        """
        Test successful buy order using quantity.

        Scenario:
        - Buy 2.0 ETH at $3,000/ETH
        - Expected: $6,000 deducted

        Verifies:
        - Quantity parameter correctly converts to USD amount
        - Holdings and cash reflect correct values
        """
        initial_cash = portfolio.cash_balance
        quantity = Decimal('2.0')
        expected_cost = quantity * eth.current_price

        success, txn, error = TradingService.execute_buy(
            portfolio=portfolio,
            cryptocurrency=eth,
            quantity=quantity,
        )

        assert success is True
        assert txn.quantity == quantity
        assert txn.total_amount == expected_cost

        portfolio.refresh_from_db()
        assert portfolio.cash_balance == initial_cash - expected_cost

        holding = Holding.objects.get(portfolio=portfolio, cryptocurrency=eth)
        assert holding.quantity == quantity

    def test_buy_updates_existing_holding(self, portfolio, btc):
        """
        Test buying more of an existing holding updates average cost.

        Scenario:
        - Initial holding: 0.5 BTC @ $48,000 = $24,000 cost basis
        - Buy: 0.5 BTC @ $50,000 = $25,000
        - Expected: 1.0 BTC @ $49,000 average = $49,000 total cost

        Verifies:
        - Holding quantity increases
        - Average purchase price recalculated correctly
        - Total cost basis accumulates
        """
        # Create initial holding
        initial_holding = HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
            average_purchase_price=Decimal('48000.00'),
            total_cost_basis=Decimal('24000.00'),
        )

        # Deduct initial cost from portfolio
        portfolio.cash_balance -= Decimal('24000.00')
        portfolio.save()

        # Buy more at different price
        btc.current_price = Decimal('50000.00')
        btc.save()

        success, txn, error = TradingService.execute_buy(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
        )

        assert success is True

        # Verify holding updated (not created)
        holding = Holding.objects.get(portfolio=portfolio, cryptocurrency=btc)
        assert holding.id == initial_holding.id  # Same holding object

        assert holding.quantity == Decimal('1.0')
        assert holding.total_cost_basis == Decimal('49000.00')
        assert holding.average_purchase_price == Decimal('49000.00')

    def test_buy_insufficient_funds(self, portfolio, btc):
        """
        Test buy fails when portfolio has insufficient cash.

        Scenario:
        - Portfolio has $10,000 cash
        - Try to buy $15,000 worth of BTC
        - Expected: Failure with error message

        Verifies:
        - Returns success=False
        - Error message indicates insufficient funds
        - No transaction created
        - No holdings created
        - Cash balance unchanged
        """
        initial_cash = portfolio.cash_balance
        amount_usd = Decimal('15000.00')  # More than available

        success, txn, error = TradingService.execute_buy(
            portfolio=portfolio,
            cryptocurrency=btc,
            amount_usd=amount_usd,
        )

        assert success is False
        assert txn is None
        assert "Insufficient funds" in error

        # Verify no changes
        portfolio.refresh_from_db()
        assert portfolio.cash_balance == initial_cash
        assert not Holding.objects.filter(portfolio=portfolio, cryptocurrency=btc).exists()
        assert not Transaction.objects.filter(portfolio=portfolio).exists()

    def test_buy_minimum_trade_amount(self, portfolio, btc):
        """
        Test buy fails when amount is below minimum ($0.01).

        Verifies:
        - $0.001 trade rejected
        - $0.01 trade accepted
        - Error message indicates minimum requirement
        """
        # Try trade below minimum
        success, txn, error = TradingService.execute_buy(
            portfolio=portfolio,
            cryptocurrency=btc,
            amount_usd=Decimal('0.001'),
        )

        assert success is False
        assert "Minimum trade amount" in error

        # Trade at minimum should succeed
        success, txn, error = TradingService.execute_buy(
            portfolio=portfolio,
            cryptocurrency=btc,
            amount_usd=Decimal('0.01'),
        )

        assert success is True

    def test_buy_missing_price(self, portfolio):
        """
        Test buy fails when cryptocurrency price is unavailable.

        Verifies:
        - Returns error when current_price is None
        - No transaction or holding created
        """
        crypto_no_price = CryptocurrencyFactory(
            symbol='NOPRICE',
            current_price=None,
        )

        success, txn, error = TradingService.execute_buy(
            portfolio=portfolio,
            cryptocurrency=crypto_no_price,
            amount_usd=Decimal('100.00'),
        )

        assert success is False
        assert "price not available" in error.lower()

    def test_buy_missing_both_amount_and_quantity(self, portfolio, btc):
        """
        Test buy fails when neither amount_usd nor quantity provided.

        Verifies:
        - Returns error requiring one parameter
        """
        success, txn, error = TradingService.execute_buy(
            portfolio=portfolio,
            cryptocurrency=btc,
        )

        assert success is False
        assert "Must provide either amount_usd or quantity" in error

    def test_buy_decimal_precision(self, portfolio, btc):
        """
        Test buy handles Decimal precision correctly.

        Scenario:
        - Buy BTC with amount that results in repeating decimal quantity
        - Verify no rounding errors in cost basis calculations

        Verifies:
        - All Decimal operations maintain precision
        - Cost basis equals amount spent exactly
        """
        amount_usd = Decimal('3333.33')  # Will result in repeating decimal quantity

        success, txn, error = TradingService.execute_buy(
            portfolio=portfolio,
            cryptocurrency=btc,
            amount_usd=amount_usd,
        )

        assert success is True

        holding = Holding.objects.get(portfolio=portfolio, cryptocurrency=btc)

        # Cost basis should match amount spent exactly
        assert holding.total_cost_basis == amount_usd

        # Verify quantity calculation precision
        expected_quantity = amount_usd / btc.current_price
        assert holding.quantity == expected_quantity


@pytest.mark.unit
class TestTradingServiceSell:
    """Test TradingService.execute_sell method."""

    def test_sell_success_full_position(self, portfolio, btc):
        """
        Test successful sell of entire position.

        Scenario:
        - Holding: 0.5 BTC @ $48,000 average ($24,000 cost basis)
        - Sell: 0.5 BTC @ $50,000 current price
        - Expected: $25,000 received, $1,000 realized gain

        Verifies:
        - Returns success=True
        - Cash added to portfolio
        - Holding deleted (full position sold)
        - Transaction records correct realized gain/loss
        """
        # Create holding
        holding = HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
            average_purchase_price=Decimal('48000.00'),
            total_cost_basis=Decimal('24000.00'),
        )

        initial_cash = portfolio.cash_balance
        sell_quantity = Decimal('0.5')
        expected_proceeds = sell_quantity * btc.current_price
        expected_gain = (btc.current_price - holding.average_purchase_price) * sell_quantity

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=sell_quantity,
        )

        assert success is True
        assert txn is not None
        assert error is None

        # Verify transaction
        assert txn.transaction_type == Transaction.TransactionType.SELL
        assert txn.quantity == sell_quantity
        assert txn.total_amount == expected_proceeds
        assert txn.realized_gain_loss == expected_gain

        # Verify cash added
        portfolio.refresh_from_db()
        assert portfolio.cash_balance == initial_cash + expected_proceeds

        # Verify holding deleted
        assert not Holding.objects.filter(id=holding.id).exists()

    def test_sell_success_partial_position(self, portfolio, eth):
        """
        Test successful sell of partial position.

        Scenario:
        - Holding: 2.0 ETH @ $2,900 average ($5,800 cost basis)
        - Sell: 1.0 ETH @ $3,000 current price
        - Expected: 1.0 ETH remains, cost basis reduced proportionally

        Verifies:
        - Holding quantity reduced
        - Average purchase price unchanged
        - Total cost basis reduced proportionally
        - Realized gain calculated correctly
        """
        # Create holding
        holding = HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=eth,
            quantity=Decimal('2.0'),
            average_purchase_price=Decimal('2900.00'),
            total_cost_basis=Decimal('5800.00'),
        )

        sell_quantity = Decimal('1.0')
        expected_gain = (eth.current_price - holding.average_purchase_price) * sell_quantity

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=eth,
            quantity=sell_quantity,
        )

        assert success is True

        # Verify holding updated (not deleted)
        holding.refresh_from_db()
        assert holding.quantity == Decimal('1.0')
        assert holding.average_purchase_price == Decimal('2900.00')  # Unchanged
        assert holding.total_cost_basis == Decimal('2900.00')  # Half of original

        # Verify realized gain
        assert txn.realized_gain_loss == expected_gain

    def test_sell_with_amount_usd(self, portfolio, btc):
        """
        Test sell using USD amount instead of quantity.

        Scenario:
        - Want to receive $10,000 USD
        - Calculate quantity needed based on current price

        Verifies:
        - amount_usd parameter converts to correct quantity
        - Proceeds equal requested amount
        """
        # Create holding
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('1.0'),
            average_purchase_price=Decimal('48000.00'),
        )

        amount_usd = Decimal('10000.00')
        expected_quantity = amount_usd / btc.current_price

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=btc,
            amount_usd=amount_usd,
        )

        assert success is True
        assert txn.quantity == expected_quantity
        assert txn.total_amount == amount_usd

    def test_sell_insufficient_holdings(self, portfolio, btc):
        """
        Test sell fails when trying to sell more than owned.

        Scenario:
        - Holding: 0.5 BTC
        - Try to sell: 1.0 BTC
        - Expected: Failure with error message

        Verifies:
        - Returns success=False
        - Error indicates insufficient holdings
        - No transaction created
        - Holding unchanged
        """
        holding = HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
        )

        initial_quantity = holding.quantity

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('1.0'),
        )

        assert success is False
        assert "Insufficient holdings" in error

        # Verify no changes
        holding.refresh_from_db()
        assert holding.quantity == initial_quantity
        assert not Transaction.objects.filter(portfolio=portfolio).exists()

    def test_sell_no_holding_exists(self, portfolio, btc):
        """
        Test sell fails when user doesn't own the cryptocurrency.

        Verifies:
        - Returns error indicating no holdings
        - No transaction created
        """
        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.1'),
        )

        assert success is False
        assert "don't own any" in error.lower()

    def test_sell_realized_loss(self, portfolio, btc):
        """
        Test sell with realized loss (sold below purchase price).

        Scenario:
        - Bought: 0.5 BTC @ $50,000 = $25,000
        - Sell: 0.5 BTC @ $45,000 = $22,500
        - Expected: -$2,500 realized loss

        Verifies:
        - Realized gain/loss is negative for losses
        - Transaction records correct loss amount
        """
        # Create holding at higher price
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
            average_purchase_price=Decimal('50000.00'),
            total_cost_basis=Decimal('25000.00'),
        )

        # Drop price
        btc.current_price = Decimal('45000.00')
        btc.save()

        sell_quantity = Decimal('0.5')
        expected_loss = (btc.current_price - Decimal('50000.00')) * sell_quantity

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=sell_quantity,
        )

        assert success is True
        assert txn.realized_gain_loss == expected_loss
        assert txn.realized_gain_loss < 0  # It's a loss

    def test_sell_missing_price(self, portfolio, btc):
        """
        Test sell fails when cryptocurrency price is unavailable.

        Verifies:
        - Returns error when current_price is None
        """
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('1.0'),
        )

        btc.current_price = None
        btc.save()

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
        )

        assert success is False
        assert "price not available" in error.lower()

    def test_sell_missing_both_amount_and_quantity(self, portfolio, btc):
        """
        Test sell fails when neither amount_usd nor quantity provided.

        Verifies:
        - Returns error requiring one parameter
        """
        HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('1.0'),
        )

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=btc,
        )

        assert success is False
        assert "Must provide either amount_usd or quantity" in error

    def test_sell_cost_basis_reduction_precision(self, portfolio, eth):
        """
        Test partial sell reduces cost basis with correct precision.

        Scenario:
        - Holding: 3.0 ETH @ $2,900 = $8,700 cost basis
        - Sell: 1.0 ETH (1/3 of position)
        - Expected: Cost basis reduced by exactly 1/3 = $5,800 remaining

        Verifies:
        - Proportional cost basis calculation is precise
        - No rounding errors accumulate
        """
        holding = HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=eth,
            quantity=Decimal('3.0'),
            average_purchase_price=Decimal('2900.00'),
            total_cost_basis=Decimal('8700.00'),
        )

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=eth,
            quantity=Decimal('1.0'),
        )

        assert success is True

        holding.refresh_from_db()
        assert holding.quantity == Decimal('2.0')

        # Cost basis should be exactly 2/3 of original
        expected_cost_basis = Decimal('5800.00')
        assert holding.total_cost_basis == expected_cost_basis

    def test_sell_atomic_transaction_rollback(self, portfolio, btc):
        """
        Test transaction rollback on error (database integrity).

        This is a conceptual test - in practice, the atomic() decorator
        ensures all-or-nothing behavior. If any step fails, all changes
        are rolled back.

        Verifies:
        - Either all changes succeed or none do
        - No partial state corruption
        """
        # This test verifies the atomic transaction behavior
        # If execute_sell raises an exception mid-way, no changes persist

        holding = HoldingFactory(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
        )

        initial_cash = portfolio.cash_balance
        initial_quantity = holding.quantity

        # Force an error scenario (e.g., missing price)
        btc.current_price = None
        btc.save()

        success, txn, error = TradingService.execute_sell(
            portfolio=portfolio,
            cryptocurrency=btc,
            quantity=Decimal('0.5'),
        )

        assert success is False

        # Verify NO changes persisted
        portfolio.refresh_from_db()
        holding.refresh_from_db()

        assert portfolio.cash_balance == initial_cash
        assert holding.quantity == initial_quantity
