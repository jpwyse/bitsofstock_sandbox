from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from typing import List, Dict
from trading.models import Portfolio, Transaction, PriceHistory, Cryptocurrency
from trading.services.coingecko import CoinGeckoService
import logging

logger = logging.getLogger(__name__)


class PortfolioService:
    """Service for portfolio calculations and analytics"""

    @staticmethod
    def calculate_portfolio_history(
        portfolio: Portfolio,
        timeframe: str
    ) -> List[Dict]:
        """
        Calculate historical portfolio values with inception handling.

        Business Rules:
        - Inception = earliest of (first trade timestamp, portfolio.created_at)
        - Pre-inception: portfolio_value = initial_investment (flat)
        - Post-inception: portfolio_value = cash + Σ(qty × price) (mark-to-market)
        - Supported timeframes for PORTFOLIO only: 1D, 5D, 1M, 3M, 6M, YTD
          (Market/asset modules may use longer ranges)

        Args:
            portfolio: User's portfolio
            timeframe: One of '1D', '5D', '1M', '3M', '6M', 'YTD'

        Returns:
            List of {'timestamp': datetime, 'portfolio_value': Decimal}
        """
        # Define timeframe parameters - PORTFOLIO-SPECIFIC LIMITS (YTD is max)
        # NOTE: Market/asset time-series may still use 1Y, 5Y, MAX
        now = timezone.now()
        timeframe_config = {
            '1D': {'days': 1, 'interval': 'hourly'},
            '5D': {'days': 5, 'interval': 'hourly'},
            '1M': {'days': 30, 'interval': 'daily'},
            '3M': {'days': 90, 'interval': 'daily'},  # Added 3M support
            '6M': {'days': 180, 'interval': 'daily'},
            'YTD': {'days': (now - datetime(now.year, 1, 1, tzinfo=now.tzinfo)).days, 'interval': 'daily'},
            # Removed 1Y, 5Y, MAX - portfolio time-series capped at YTD
        }

        config = timeframe_config.get(timeframe, timeframe_config['1M'])
        start_date = now - timedelta(days=config['days'])

        # Calculate inception: earliest of (first trade, portfolio creation)
        # Trades may be back-dated, so inception can precede portfolio.created_at
        first_transaction = Transaction.objects.filter(
            portfolio=portfolio
        ).order_by('timestamp').first()

        if first_transaction:
            inception = min(first_transaction.timestamp, portfolio.created_at)
        else:
            inception = portfolio.created_at

        # Get all transactions in timeframe
        transactions = Transaction.objects.filter(
            portfolio=portfolio,
            timestamp__gte=start_date
        ).order_by('timestamp').select_related('cryptocurrency')

        # Get historical prices for all cryptocurrencies held
        crypto_ids = set(txn.cryptocurrency_id for txn in transactions)
        crypto_ids.update(holding.cryptocurrency_id for holding in portfolio.holdings.all())

        cryptos = Cryptocurrency.objects.filter(id__in=crypto_ids)

        # Build price history cache (batch fetching for performance)
        price_cache = {}
        coingecko_service = CoinGeckoService()

        for crypto in cryptos:
            try:
                historical_prices = coingecko_service.get_historical_prices(
                    crypto.coingecko_id,
                    config['days']
                )
                price_cache[crypto.id] = {
                    hp['timestamp']: hp['price']
                    for hp in historical_prices
                }

                # Fallback: If no historical prices but current_price exists, use it for recent dates
                if not price_cache[crypto.id] and crypto.current_price:
                    logger.info(f"Using current price as fallback for {crypto.symbol}")
                    price_cache[crypto.id] = {
                        now: crypto.current_price
                    }
            except Exception as e:
                # Non-blocking: log warning but continue (symbol contributes zero)
                logger.warning(f"Failed to fetch prices for {crypto.symbol}: {e}")
                # Try to use current price as last resort
                if crypto.current_price:
                    price_cache[crypto.id] = {now: crypto.current_price}
                else:
                    price_cache[crypto.id] = {}

        # Calculate portfolio value at each time point
        data_points = []

        if config['interval'] == 'hourly':
            time_points = [start_date + timedelta(hours=i) for i in range(config['days'] * 24)]
        elif config['interval'] == 'daily':
            time_points = [start_date + timedelta(days=i) for i in range(config['days'])]
        else:
            time_points = [start_date + timedelta(weeks=i) for i in range(config['days'] // 7)]

        # Track holdings over time
        holdings_tracker = {}

        # TODO: Future enhancement - implement exact cash reconstruction
        # Currently approximating historical cash as current cash_balance
        # For accurate P&L, should track cash flow ledger (deposits/withdrawals)
        # and reconstruct cash(t) = initial_cash - Σbuys(≤t) + Σsells(≤t)
        cash_balance = portfolio.cash_balance  # Approximation per spec

        for time_point in time_points:
            # PRE-INCEPTION: Return flat initial_investment
            if time_point < inception:
                data_points.append({
                    'timestamp': time_point,
                    'portfolio_value': portfolio.initial_cash
                })
                continue

            # POST-INCEPTION: Calculate mark-to-market value
            # Apply all transactions up to this point
            relevant_txns = [t for t in transactions if t.timestamp <= time_point]

            # Reset and recalculate quantities
            holdings_tracker = {}

            for txn in relevant_txns:
                if txn.transaction_type == Transaction.TransactionType.BUY:
                    holdings_tracker[txn.cryptocurrency_id] = holdings_tracker.get(
                        txn.cryptocurrency_id, Decimal('0')
                    ) + txn.quantity
                else:
                    holdings_tracker[txn.cryptocurrency_id] = holdings_tracker.get(
                        txn.cryptocurrency_id, Decimal('0')
                    ) - txn.quantity

            # Calculate holdings value at this time point (forward-fill prices)
            holdings_value = Decimal('0')
            for crypto_id, quantity in holdings_tracker.items():
                if quantity > 0:
                    crypto_prices = price_cache.get(crypto_id, {})
                    closest_price = PortfolioService._get_closest_price(
                        crypto_prices,
                        time_point
                    )
                    if closest_price:
                        holdings_value += quantity * closest_price
                    # Note: Missing prices are non-blocking; holding contributes $0 to portfolio value
                    # This can happen for very recent dates where CoinGecko data isn't yet available

            portfolio_value = cash_balance + holdings_value

            data_points.append({
                'timestamp': time_point,
                'portfolio_value': portfolio_value
            })

        return data_points

    @staticmethod
    def _get_closest_price(prices: Dict[datetime, Decimal], target: datetime) -> Decimal:
        """
        Find the closest price to target timestamp using forward-fill strategy.

        Prefers the most recent price at or before target (forward-fill).
        Falls back to nearest price if no prior prices exist.
        """
        if not prices:
            return Decimal('0')

        # Forward-fill: get all prices at or before target
        prior_prices = {t: p for t, p in prices.items() if t <= target}

        if prior_prices:
            # Return most recent prior price
            closest_time = max(prior_prices.keys())
            return prior_prices[closest_time]

        # Fallback: use earliest available price (rare edge case)
        closest_time = min(prices.keys())
        return prices[closest_time]
