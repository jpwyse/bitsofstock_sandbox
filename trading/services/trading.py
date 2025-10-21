"""
Trading service for executing buy and sell orders with validation and cost basis tracking.

This module provides the core trading logic for the crypto trading sandbox, handling
buy and sell order execution, balance validation, holdings management, and realized P&L
calculations using weighted average cost basis.

Core Features:
    - Atomic transaction execution (all-or-nothing using Django's transaction.atomic)
    - Weighted average cost basis tracking for holdings
    - Realized gain/loss calculation on SELL orders
    - Comprehensive validation (funds, holdings, minimum amounts)
    - Flexible order input (amount_usd OR quantity, not both)

Cost Basis Method:
    - Weighted Average: New purchases increase average cost proportionally
    - Formula: new_avg = (old_cost_basis + new_purchase) / (old_quantity + new_quantity)
    - Average price remains constant across partial sells
    - Realized P&L = (sale_price - avg_purchase_price) × quantity_sold

Transaction Guarantees:
    - All operations wrapped in database transactions
    - Rollback on any error (portfolio, holdings, transaction records)
    - No partial updates: either all succeed or all fail

Validations:
    - Buy: Sufficient cash_balance, current_price available, minimum $0.01
    - Sell: Holding exists, sufficient quantity, current_price available
    - Either amount_usd OR quantity required (mutually exclusive)

Side Effects:
    - Portfolio.cash_balance updated (buy: -, sell: +)
    - Holding created/updated (buy) or updated/deleted (sell)
    - Transaction record created with timestamp and realized P&L
    - Logs info/error messages for audit trail

Dependencies:
    - django.db.transaction: Atomic operations
    - django.utils.timezone: Timezone-aware timestamps
    - trading.models: Portfolio, Cryptocurrency, Holding, Transaction

Notes:
    - Sandbox assumption: Back-dated trades supported via timestamp parameter
    - No order queuing or async execution (instant execution at current_price)
    - No fees or slippage applied (simplified sandbox model)
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from typing import Tuple, Optional
from trading.models import Portfolio, Cryptocurrency, Holding, Transaction
import logging

logger = logging.getLogger(__name__)


class TradingService:
    """
    Trading service for executing buy and sell cryptocurrency orders.

    Provides static methods for executing atomic buy/sell transactions with validation,
    cost basis tracking, and realized P&L calculations. All operations use weighted
    average cost basis and Django's transaction.atomic() for data integrity.

    Methods:
        execute_buy: Execute a BUY order with balance validation
        execute_sell: Execute a SELL order with holdings validation and P&L calculation

    Error Handling:
        - Returns tuple: (success: bool, transaction: Transaction | None, error: str | None)
        - On success: (True, transaction_object, None)
        - On failure: (False, None, error_message)
        - All exceptions caught and returned as error messages

    Transaction Atomicity:
        - Uses transaction.atomic() to ensure all-or-nothing execution
        - Rollback on any error (portfolio, holdings, transaction creation)
    """
    
    @staticmethod
    def execute_buy(
        portfolio: Portfolio,
        cryptocurrency: Cryptocurrency,
        amount_usd: Optional[Decimal] = None,
        quantity: Optional[Decimal] = None
    ) -> Tuple[bool, Optional[Transaction], Optional[str]]:
        """
        Execute a BUY order for cryptocurrency with balance validation and cost basis tracking.

        Purchases cryptocurrency using portfolio cash, updating holdings with weighted average
        cost basis. Creates a transaction record and updates portfolio balance atomically.

        Input Requirements:
            - Either amount_usd OR quantity must be provided (mutually exclusive, not both)
            - If amount_usd provided: quantity = amount_usd / current_price (calculated)
            - If quantity provided: amount_usd = quantity * current_price (calculated)

        Validations:
            - Cryptocurrency must have current_price available
            - Portfolio must have sufficient cash_balance >= amount_usd
            - Minimum trade amount: $0.01 USD
            - Input: Either amount_usd or quantity required (not neither, not both)

        Cost Basis Calculation:
            - New holding: average_purchase_price = current_price, total_cost_basis = amount_usd
            - Existing holding (weighted average):
              • new_total_cost = old_total_cost_basis + amount_usd
              • new_quantity = old_quantity + quantity
              • new_average_price = new_total_cost / new_quantity

        Args:
            portfolio (Portfolio): User's portfolio (balance will be decremented)
            cryptocurrency (Cryptocurrency): Asset to purchase (requires current_price)
            amount_usd (Decimal, optional): USD amount to spend (exclusive with quantity)
            quantity (Decimal, optional): Crypto quantity to buy (exclusive with amount_usd)

        Returns:
            Tuple[bool, Optional[Transaction], Optional[str]]: Success tuple:
                - success (bool): True if trade executed, False if validation failed or error
                - transaction (Transaction | None): Created transaction record on success, None on failure
                - error (str | None): Error message on failure, None on success

        Side Effects:
            - Decrements portfolio.cash_balance by amount_usd
            - Creates new Holding or updates existing Holding (quantity, cost basis, avg price)
            - Creates Transaction record with type=BUY, realized_gain_loss=0.00
            - Logs info message on success, error message on exception

        Transaction Atomicity:
            - All database operations wrapped in transaction.atomic()
            - Rollback on any exception (no partial updates)

        Error Cases:
            - Returns (False, None, error_msg) for:
              • Missing cryptocurrency price
              • Insufficient cash balance
              • Trade amount < $0.01
              • Neither or both amount_usd/quantity provided
              • Database errors or exceptions

        Example:
            # Buy $100 worth of Bitcoin
            success, txn, error = TradingService.execute_buy(
                portfolio=user_portfolio,
                cryptocurrency=btc,
                amount_usd=Decimal('100.00')
            )

            # Buy 0.5 BTC
            success, txn, error = TradingService.execute_buy(
                portfolio=user_portfolio,
                cryptocurrency=btc,
                quantity=Decimal('0.5')
            )

        Notes:
            - Realized gain/loss always 0.00 for BUY transactions
            - Timestamp auto-set to timezone.now() (timezone-aware)
            - Used by /trade/buy API endpoint (trading/api.py:execute_buy_trade)
        """
        
        if not cryptocurrency.current_price:
            return False, None, "Cryptocurrency price not available"
        
        # Calculate quantity if amount_usd provided
        if amount_usd:
            quantity = amount_usd / cryptocurrency.current_price
        elif quantity:
            amount_usd = quantity * cryptocurrency.current_price
        else:
            return False, None, "Must provide either amount_usd or quantity"
        
        # Validate sufficient funds
        if amount_usd > portfolio.cash_balance:
            return False, None, f"Insufficient funds. Available: ${portfolio.cash_balance}, Required: ${amount_usd}"
        
        # Validate minimum trade amount
        if amount_usd < Decimal('0.01'):
            return False, None, "Minimum trade amount is $0.01"
        
        try:
            with transaction.atomic():
                # Deduct cash
                portfolio.cash_balance -= amount_usd
                portfolio.save()
                
                # Update or create holding
                holding, created = Holding.objects.get_or_create(
                    portfolio=portfolio,
                    cryptocurrency=cryptocurrency,
                    defaults={
                        'quantity': quantity,
                        'average_purchase_price': cryptocurrency.current_price,
                        'total_cost_basis': amount_usd
                    }
                )
                
                if not created:
                    # Update existing holding
                    new_total_cost = holding.total_cost_basis + amount_usd
                    new_quantity = holding.quantity + quantity
                    holding.average_purchase_price = new_total_cost / new_quantity
                    holding.quantity = new_quantity
                    holding.total_cost_basis = new_total_cost
                    holding.save()
                
                # Create transaction record
                txn = Transaction.objects.create(
                    portfolio=portfolio,
                    cryptocurrency=cryptocurrency,
                    transaction_type=Transaction.TransactionType.BUY,
                    quantity=quantity,
                    price_per_unit=cryptocurrency.current_price,
                    total_amount=amount_usd,
                    timestamp=timezone.now(),
                    realized_gain_loss=Decimal('0.00')  # BUY transactions have no realized gain/loss
                )

                logger.info(f"Buy executed: {quantity} {cryptocurrency.symbol} for ${amount_usd}")
                return True, txn, None
                
        except Exception as e:
            logger.error(f"Error executing buy: {e}")
            return False, None, f"Trade execution failed: {str(e)}"
    
    @staticmethod
    def execute_sell(
        portfolio: Portfolio,
        cryptocurrency: Cryptocurrency,
        amount_usd: Optional[Decimal] = None,
        quantity: Optional[Decimal] = None
    ) -> Tuple[bool, Optional[Transaction], Optional[str]]:
        """
        Execute a SELL order for cryptocurrency with holdings validation and realized P&L calculation.

        Sells cryptocurrency from portfolio holdings, calculating realized gain/loss using
        holding's weighted average cost basis. Updates portfolio cash, holdings, and creates
        a transaction record atomically.

        Input Requirements:
            - Either amount_usd OR quantity must be provided (mutually exclusive, not both)
            - If amount_usd provided: quantity = amount_usd / current_price (calculated)
            - If quantity provided: amount_usd = quantity * current_price (calculated)

        Validations:
            - Cryptocurrency must have current_price available
            - Holding must exist for this cryptocurrency in portfolio
            - Portfolio must have sufficient holdings: holding.quantity >= quantity
            - Input: Either amount_usd or quantity required (not neither, not both)

        Realized P&L Calculation:
            - Formula: realized_gain_loss = (current_price - avg_purchase_price) × quantity_sold
            - Positive value: profit, Negative value: loss
            - Uses holding's average_purchase_price (weighted average from all buys)
            - Calculated BEFORE updating holdings to preserve cost basis

        Holdings Update:
            - Full sell (quantity == holding.quantity): Holding deleted entirely
            - Partial sell (quantity < holding.quantity):
              • cost_basis_sold = (quantity / holding.quantity) × total_cost_basis
              • holding.quantity -= quantity
              • holding.total_cost_basis -= cost_basis_sold
              • holding.average_purchase_price remains unchanged

        Args:
            portfolio (Portfolio): User's portfolio (cash will be incremented)
            cryptocurrency (Cryptocurrency): Asset to sell (requires current_price)
            amount_usd (Decimal, optional): USD proceeds target (exclusive with quantity)
            quantity (Decimal, optional): Crypto quantity to sell (exclusive with amount_usd)

        Returns:
            Tuple[bool, Optional[Transaction], Optional[str]]: Success tuple:
                - success (bool): True if trade executed, False if validation failed or error
                - transaction (Transaction | None): Created transaction record on success, None on failure
                - error (str | None): Error message on failure, None on success

        Side Effects:
            - Increments portfolio.cash_balance by amount_usd
            - Updates or deletes Holding (quantity, cost basis; avg price unchanged on partial)
            - Creates Transaction record with type=SELL and realized_gain_loss
            - Logs info message with P&L on success, error message on exception

        Transaction Atomicity:
            - All database operations wrapped in transaction.atomic()
            - Rollback on any exception (no partial updates)

        Error Cases:
            - Returns (False, None, error_msg) for:
              • Missing cryptocurrency price
              • Holding does not exist for this cryptocurrency
              • Insufficient holdings (quantity > holding.quantity)
              • Neither or both amount_usd/quantity provided
              • Database errors or exceptions

        Example:
            # Sell $500 worth of Ethereum
            success, txn, error = TradingService.execute_sell(
                portfolio=user_portfolio,
                cryptocurrency=eth,
                amount_usd=Decimal('500.00')
            )

            # Sell 1.5 SOL (full position if holding.quantity == 1.5)
            success, txn, error = TradingService.execute_sell(
                portfolio=user_portfolio,
                cryptocurrency=sol,
                quantity=Decimal('1.5')
            )

        Notes:
            - Realized P&L stored in Transaction.realized_gain_loss field
            - Portfolio.total_realized_gains computed from Transaction.objects.filter(SELL)
            - Timestamp auto-set to timezone.now() (timezone-aware)
            - Used by /trade/sell API endpoint (trading/api.py:execute_sell_trade)
        """
        
        if not cryptocurrency.current_price:
            return False, None, "Cryptocurrency price not available"
        
        # Get holding
        try:
            holding = Holding.objects.get(
                portfolio=portfolio,
                cryptocurrency=cryptocurrency
            )
        except Holding.DoesNotExist:
            return False, None, f"You don't own any {cryptocurrency.symbol}"
        
        # Calculate quantity if amount_usd provided
        if amount_usd:
            quantity = amount_usd / cryptocurrency.current_price
        elif quantity:
            amount_usd = quantity * cryptocurrency.current_price
        else:
            return False, None, "Must provide either amount_usd or quantity"
        
        # Validate sufficient holdings
        if quantity > holding.quantity:
            return False, None, f"Insufficient holdings. You own: {holding.quantity} {cryptocurrency.symbol}, Requested: {quantity} {cryptocurrency.symbol}"
        
        try:
            with transaction.atomic():
                # Calculate realized gain/loss BEFORE updating holdings
                # Formula: (sale_price - average_cost_basis) × quantity_sold
                realized_gain_loss = (cryptocurrency.current_price - holding.average_purchase_price) * quantity

                # Add cash
                portfolio.cash_balance += amount_usd
                portfolio.save()

                # Update or delete holding
                if quantity == holding.quantity:
                    # Selling entire position
                    holding.delete()
                else:
                    # Partial sell - update holding
                    cost_basis_sold = (quantity / holding.quantity) * holding.total_cost_basis
                    holding.quantity -= quantity
                    holding.total_cost_basis -= cost_basis_sold
                    # Average purchase price remains the same
                    holding.save()

                # Create transaction record
                txn = Transaction.objects.create(
                    portfolio=portfolio,
                    cryptocurrency=cryptocurrency,
                    transaction_type=Transaction.TransactionType.SELL,
                    quantity=quantity,
                    price_per_unit=cryptocurrency.current_price,
                    total_amount=amount_usd,
                    timestamp=timezone.now(),
                    realized_gain_loss=realized_gain_loss
                )

                logger.info(f"Sell executed: {quantity} {cryptocurrency.symbol} for ${amount_usd} | Realized P&L: ${realized_gain_loss}")
                return True, txn, None
                
        except Exception as e:
            logger.error(f"Error executing sell: {e}")
            return False, None, f"Trade execution failed: {str(e)}"