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
        Calculate historical portfolio values

        Args:
            portfolio: User's portfolio
            timeframe: One of '1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'

        Returns:
            List of {'timestamp': datetime, 'portfolio_value': Decimal}
        """
        # Define timeframe parameters
        now = timezone.now()
        timeframe_config = {
            '1D': {'days': 1, 'interval': 'hourly'},
            '5D': {'days': 5, 'interval': 'hourly'},
            '1M': {'days': 30, 'interval': 'daily'},
            '6M': {'days': 180, 'interval': 'daily'},
            'YTD': {'days': (now - datetime(now.year, 1, 1, tzinfo=now.tzinfo)).days, 'interval': 'daily'},
            '1Y': {'days': 365, 'interval': 'daily'},
            '5Y': {'days': 1825, 'interval': 'weekly'},
            'MAX': {'days': 3650, 'interval': 'weekly'},
        }

        config = timeframe_config.get(timeframe, timeframe_config['1M'])
        start_date = now - timedelta(days=config['days'])

        # Get all transactions in timeframe
        transactions = Transaction.objects.filter(
            portfolio=portfolio,
            timestamp__gte=start_date
        ).order_by('timestamp').select_related('cryptocurrency')

        # Get historical prices for all cryptocurrencies held
        crypto_ids = set(txn.cryptocurrency_id for txn in transactions)
        crypto_ids.update(holding.cryptocurrency_id for holding in portfolio.holdings.all())

        cryptos = Cryptocurrency.objects.filter(id__in=crypto_ids)

        # Build price history cache
        price_cache = {}
        coingecko_service = CoinGeckoService()

        for crypto in cryptos:
            historical_prices = coingecko_service.get_historical_prices(
                crypto.coingecko_id,
                config['days']
            )
            price_cache[crypto.id] = {
                hp['timestamp']: hp['price']
                for hp in historical_prices
            }

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
        cash_balance = portfolio.initial_cash

        for time_point in time_points:
            # Apply all transactions up to this point
            relevant_txns = [t for t in transactions if t.timestamp <= time_point]

            # Reset and recalculate
            holdings_tracker = {}
            cash_balance = portfolio.initial_cash

            for txn in relevant_txns:
                if txn.transaction_type == Transaction.TransactionType.BUY:
                    cash_balance -= txn.total_amount
                    holdings_tracker[txn.cryptocurrency_id] = holdings_tracker.get(
                        txn.cryptocurrency_id, Decimal('0')
                    ) + txn.quantity
                else:
                    cash_balance += txn.total_amount
                    holdings_tracker[txn.cryptocurrency_id] = holdings_tracker.get(
                        txn.cryptocurrency_id, Decimal('0')
                    ) - txn.quantity

            # Calculate holdings value at this time point
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

            portfolio_value = cash_balance + holdings_value

            data_points.append({
                'timestamp': time_point,
                'portfolio_value': portfolio_value
            })

        return data_points

    @staticmethod
    def _get_closest_price(prices: Dict[datetime, Decimal], target: datetime) -> Decimal:
        """Find the closest price to target timestamp"""
        if not prices:
            return Decimal('0')

        closest_time = min(prices.keys(), key=lambda t: abs((t - target).total_seconds()))
        return prices[closest_time]
