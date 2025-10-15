from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from typing import Tuple, Optional
from trading.models import Portfolio, Cryptocurrency, Holding, Transaction
import logging

# Create your services here.

logger = logging.getLogger(__name__)


class TradingService:
    """Service for executing buy/sell trades"""
    
    @staticmethod
    def execute_buy(
        portfolio: Portfolio,
        cryptocurrency: Cryptocurrency,
        amount_usd: Optional[Decimal] = None,
        quantity: Optional[Decimal] = None
    ) -> Tuple[bool, Optional[Transaction], Optional[str]]:
        """
        Execute a buy order
        
        Args:
            portfolio: User's portfolio
            cryptocurrency: Cryptocurrency to buy
            amount_usd: USD amount to spend (exclusive with quantity)
            quantity: Crypto quantity to buy (exclusive with amount_usd)
            
        Returns:
            (success: bool, transaction: Transaction | None, error: str | None)
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
                    timestamp=timezone.now()
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
        Execute a sell order
        
        Args:
            portfolio: User's portfolio
            cryptocurrency: Cryptocurrency to sell
            amount_usd: USD amount to receive (exclusive with quantity)
            quantity: Crypto quantity to sell (exclusive with amount_usd)
            
        Returns:
            (success: bool, transaction: Transaction | None, error: str | None)
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
                    timestamp=timezone.now()
                )
                
                logger.info(f"Sell executed: {quantity} {cryptocurrency.symbol} for ${amount_usd}")
                return True, txn, None
                
        except Exception as e:
            logger.error(f"Error executing sell: {e}")
            return False, None, f"Trade execution failed: {str(e)}"