"""
Portfolio service for time-series analytics, historical valuation, and performance metrics.

This module provides portfolio analytics functionality, including historical portfolio value
calculation with inception handling, pre-inception flat value returns, and post-inception
mark-to-market valuation using CoinGecko historical prices.

Core Features:
    - Time-series portfolio value reconstruction for charts
    - Inception calculation: earliest of (first trade timestamp, portfolio.created_at)
    - Pre-inception handling: flat initial_investment value
    - Post-inception valuation: cash + Σ(quantity × price) mark-to-market
    - Forward-fill price strategy for missing data points
    - Non-blocking price failures (assets contribute $0 if price unavailable)

Timeframe Limits:
    - Portfolio-specific timeframes: 1D, 5D, 1M, 3M, 6M, YTD (capped at YTD)
    - Market/asset modules may support longer ranges (1Y, 5Y, MAX)
    - Interval selection: hourly (<= 5 days), daily (> 5 days)

Inception Logic:
    - Inception = min(first_transaction.timestamp, portfolio.created_at)
    - Handles back-dated trades (sandbox assumption)
    - Pre-inception: returns initial_cash (flat value)
    - Post-inception: returns mark-to-market value

Price Forward-Fill Strategy:
    - Prefers most recent price at or before target timestamp
    - Falls back to earliest available price if no prior prices exist
    - Missing prices: asset contributes $0 to portfolio value (non-blocking)

Cash Approximation:
    - Current implementation: Uses current portfolio.cash_balance for all time points
    - TODO: Implement exact cash reconstruction via ledger:
      • cash(t) = initial_cash - Σbuys(≤t) + Σsells(≤t)
      • Requires tracking all historical cash flows
      • Acceptable approximation for sandbox demo purposes

Dependencies:
    - CoinGeckoService: Historical price data (get_historical_prices)
    - trading.models: Portfolio, Transaction, Cryptocurrency
    - django.utils.timezone: Timezone-aware datetime handling

Side Effects:
    - Logs warnings for missing price data (non-blocking)
    - Logs info for price fallback strategies
    - No database writes (read-only analytics)

Notes:
    - Used by /portfolio/history API endpoint
    - Frontend charts display results in Recharts
    - Timeframe selection handled by client (Portfolio.js tabs)
"""
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
    """
    Portfolio analytics service for time-series calculations and historical valuation.

    Provides static methods for calculating historical portfolio values with inception
    handling, forward-fill price strategies, and non-blocking error handling for external
    price data dependencies.

    Methods:
        calculate_portfolio_history: Generate time-series portfolio values for charting
        _get_closest_price: Find closest historical price using forward-fill strategy

    Error Handling:
        - Missing prices: Assets contribute $0 (non-blocking, logged as warning)
        - CoinGecko failures: Fallback to current_price if available
        - Empty price data: Returns $0 for that asset at that time point

    Performance:
        - Batch fetches all crypto prices upfront (reduces CoinGecko API calls)
        - Caches prices in memory for time-series calculation
        - Computes holdings incrementally (avoids N×M database queries)
    """

    @staticmethod
    def calculate_portfolio_history(
        portfolio: Portfolio,
        timeframe: str
    ) -> List[Dict]:
        """
        Calculate historical portfolio values over time with inception handling and mark-to-market valuation.

        Generates time-series data for portfolio performance charts, handling pre-inception periods
        with flat initial values and post-inception periods with mark-to-market valuation using
        historical cryptocurrency prices from CoinGecko.

        Inception Logic:
            - Inception = min(first_transaction.timestamp, portfolio.created_at)
            - Handles back-dated trades (trades may precede portfolio creation)
            - Pre-inception time points: Return portfolio.initial_cash (flat value)
            - Post-inception time points: Return cash + Σ(quantity × historical_price)

        Valuation Method:
            - Pre-inception: portfolio_value = initial_cash (constant)
            - Post-inception: portfolio_value = cash_balance + holdings_value
              • holdings_value = Σ(quantity_at_time × price_at_time) for each crypto
              • Quantity tracking: BUY adds, SELL subtracts (reconstructed from transactions)
              • Prices: Forward-fill strategy via _get_closest_price()

        Timeframe Configuration:
            - Portfolio-specific limits (capped at YTD):
              • 1D: 24 hours, hourly intervals
              • 5D: 5 days, hourly intervals
              • 1M: 30 days, daily intervals
              • 3M: 90 days, daily intervals
              • 6M: 180 days, daily intervals
              • YTD: Current year to date, daily intervals
            - Note: Market/asset charts may still use 1Y, 5Y, MAX (not portfolio-specific)

        Cash Approximation:
            - Current implementation: Uses portfolio.cash_balance for all time points
            - TODO: Implement exact reconstruction (cash(t) = initial - Σbuys + Σsells)
            - Acceptable for sandbox demo; exact ledger tracking for production

        Args:
            portfolio (Portfolio): User's portfolio to analyze
            timeframe (str): Time range for analysis. Valid values:
                - '1D': Last 24 hours (hourly intervals)
                - '5D': Last 5 days (hourly intervals)
                - '1M': Last 30 days (daily intervals)
                - '3M': Last 90 days (daily intervals)
                - '6M': Last 180 days (daily intervals)
                - 'YTD': Year to date (daily intervals)
                Defaults to '1M' if invalid value provided

        Returns:
            List[Dict]: Chronological time-series data points:
                [
                    {
                        'timestamp': datetime (timezone-aware UTC),
                        'portfolio_value': Decimal (USD)
                    },
                    ...
                ]

        Side Effects:
            - Logs warnings for cryptocurrencies with missing price data
            - Logs info when using current_price as fallback
            - Calls CoinGecko API for each unique cryptocurrency (counts against rate limit)
            - No database writes (read-only operation)

        Error Handling:
            - CoinGecko failures: Falls back to current_price if available, else $0
            - Missing prices: Asset contributes $0 to portfolio value (non-blocking)
            - Empty transaction history: All time points return current portfolio value
            - Invalid timeframe: Defaults to '1M' (30 days)

        Performance Considerations:
            - Batch fetches all crypto prices upfront (N API calls for N cryptos)
            - Caches prices in memory for time-series calculation
            - Incremental holdings reconstruction (avoids repeated database queries)
            - CoinGecko rate limits: Free tier ~10-50 calls/min, Pro tier ~500 calls/min

        Example:
            # Get 30-day portfolio history
            data = PortfolioService.calculate_portfolio_history(
                portfolio=user_portfolio,
                timeframe='1M'
            )
            # Returns:
            # [
            #     {'timestamp': datetime(2025, 01, 15, 0, 0), 'portfolio_value': Decimal('10000.00')},
            #     {'timestamp': datetime(2025, 01, 16, 0, 0), 'portfolio_value': Decimal('10250.75')},
            #     ...
            # ]

        Notes:
            - Used by /portfolio/history API endpoint (trading/api.py:get_portfolio_history)
            - Frontend displays results in Recharts (PortfolioPerformanceChart.js)
            - Timezone-aware timestamps (USE_TZ=True)
            - YTD timeframe dynamically calculated based on current date
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
        Find the closest historical price to target timestamp using forward-fill strategy.

        Implements forward-fill (last observation carried forward) for time-series price data,
        preferring the most recent price at or before the target timestamp. Falls back to the
        earliest available price if no prior prices exist (rare edge case).

        Forward-Fill Strategy:
            1. Primary: Use most recent price where timestamp <= target
            2. Fallback: Use earliest available price if no prior prices exist
            3. Default: Return Decimal('0') if prices dict is empty

        Use Cases:
            - Handling missing intraday prices (CoinGecko daily intervals)
            - Filling gaps in price data during low-volume periods
            - Weekend/holiday price continuation for 24/7 crypto markets

        Args:
            prices (Dict[datetime, Decimal]): Price history mapping:
                {
                    datetime (timezone-aware): Decimal (USD price),
                    ...
                }
            target (datetime): Target timestamp for price lookup (timezone-aware)

        Returns:
            Decimal: Price at or before target timestamp. Returns Decimal('0') if no prices available.

        Algorithm:
            1. Filter prices to only timestamps <= target (prior_prices)
            2. If prior_prices exists:
               - Return price at max(prior_prices.keys()) [most recent prior]
            3. Else (no prior prices):
               - Return price at min(prices.keys()) [earliest available]
            4. If prices dict is empty:
               - Return Decimal('0')

        Example:
            prices = {
                datetime(2025, 01, 15, 12, 0): Decimal('42000.00'),
                datetime(2025, 01, 15, 18, 0): Decimal('43000.00'),
                datetime(2025, 01, 16, 12, 0): Decimal('44000.00'),
            }

            # Forward-fill: target between data points
            _get_closest_price(prices, datetime(2025, 01, 15, 20, 0))
            # Returns: Decimal('43000.00') (most recent prior)

            # Forward-fill: exact match
            _get_closest_price(prices, datetime(2025, 01, 16, 12, 0))
            # Returns: Decimal('44000.00') (exact match)

            # Fallback: target before all prices
            _get_closest_price(prices, datetime(2025, 01, 14, 0, 0))
            # Returns: Decimal('42000.00') (earliest available)

        Notes:
            - Private method (internal use by calculate_portfolio_history)
            - No database access (operates on in-memory price cache)
            - Timezone-aware datetime required for correct comparison
            - Empty prices dict returns 0 (asset contributes $0 to portfolio value)
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
