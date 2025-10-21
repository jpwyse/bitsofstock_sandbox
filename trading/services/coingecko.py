"""
CoinGecko API integration service for real-time cryptocurrency market data.

This module provides a service layer for fetching current prices, historical data,
and asset metadata from the CoinGecko API. Supports both free and pro API tiers
with automatic API key injection from Django settings.

External API:
    CoinGecko API v3 (https://www.coingecko.com/en/api)

Rate Limits:
    - Free tier: 10-50 calls/minute (varies by endpoint)
    - Pro tier: Up to 500 calls/minute with API key
    - Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining
    - Exceeded: Returns HTTP 429 Too Many Requests

Error Handling:
    - Network timeouts: 10-15 second timeouts on requests
    - HTTP errors: Logged and return empty dict/list (graceful degradation)
    - Invalid responses: Logged and return empty dict/list
    - No retry logic: Single-attempt requests (TODO: Add exponential backoff)

Caching:
    - No built-in caching (TODO: Add Redis caching for price data)
    - Recommended: Cache prices for 30-60 seconds to reduce API calls

Data Precision:
    - All prices converted to Decimal for accuracy
    - Timestamps converted to timezone-aware datetime (UTC)

Dependencies:
    - requests: HTTP client
    - django.conf.settings: API key and base URL configuration
    - django.utils.timezone: Timezone-aware datetime handling
"""
import requests
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone as django_timezone
from django.conf import settings
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class CoinGeckoService:
    """
    CoinGecko API client for cryptocurrency market data.

    Provides methods for fetching current prices, historical price data, and coin
    metadata from the CoinGecko API. Supports optional API key authentication for
    pro tier rate limits.

    Attributes:
        BASE_URL (str): CoinGecko API base URL from settings
        SUPPORTED_CRYPTOS (dict): Symbol to CoinGecko ID mapping
        session (requests.Session): HTTP session with optional API key header

    Rate Limits:
        - Free tier: ~10-50 calls/minute
        - Pro tier: Up to 500 calls/minute (with API key)
        - No automatic rate limiting (TODO: Add throttling)

    Methods:
        get_current_prices(): Fetch latest prices for all supported cryptocurrencies
        get_historical_prices(coingecko_id, days): Fetch historical price data
        get_coin_info(coingecko_id): Fetch coin metadata (name, symbol, icon)

    Error Handling:
        - Returns empty dict/list on failures for graceful degradation
        - Logs all errors for debugging
        - No retries (single-attempt requests)
    """
    
    BASE_URL = settings.COINGECKO_API_URL
    
    SUPPORTED_CRYPTOS = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'XRP': 'ripple',
        'USDC': 'usd-coin',
    }
    
    def __init__(self):
        self.session = requests.Session()
        if settings.COINGECKO_API_KEY:
            self.session.headers.update({
                'X-CG-API-KEY': settings.COINGECKO_API_KEY
            })
    
    def get_current_prices(self) -> Dict[str, Dict]:
        """
        Fetch current market data for all supported cryptocurrencies.

        Makes a single batch request to CoinGecko's /simple/price endpoint to fetch
        current prices, 24h change, volume, and market cap for all cryptos in
        SUPPORTED_CRYPTOS.

        API Endpoint:
            GET /api/v3/simple/price

        Rate Limit Impact:
            Counts as 1 API call (batch request for multiple coins)

        Returns:
            Dict[str, Dict]: Symbol-keyed dictionary with market data:
                {
                    'BTC': {
                        'price': Decimal,           # Current USD price
                        'change_24h': Decimal,      # 24h percentage change
                        'volume_24h': Decimal,      # 24h trading volume USD
                        'market_cap': Decimal       # Market capitalization USD
                    },
                    ...
                }
            Empty dict on error (graceful degradation)

        Error Handling:
            - Network timeout (10s): Returns {}
            - HTTP 429 (rate limit): Returns {} and logs error
            - Invalid JSON: Returns {} and logs error
            - Missing coins in response: Skipped (partial data returned)

        Side Effects:
            - Logs errors to logger.error() on failures
            - No database writes
            - No caching (TODO)

        Notes:
            - Converts all numeric values to Decimal for precision
            - Missing fields default to 0 (e.g., change_24h, volume_24h)
            - Requires CoinGecko IDs in SUPPORTED_CRYPTOS mapping
        """
        try:
            ids = ','.join(self.SUPPORTED_CRYPTOS.values())
            url = f"{self.BASE_URL}/simple/price"
            params = {
                'ids': ids,
                'vs_currencies': 'usd',
                'include_24hr_change': 'true',
                'include_24hr_vol': 'true',
                'include_market_cap': 'true',
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Transform to symbol-keyed dict
            result = {}
            for symbol, coingecko_id in self.SUPPORTED_CRYPTOS.items():
                if coingecko_id in data:
                    coin_data = data[coingecko_id]
                    result[symbol] = {
                        'price': Decimal(str(coin_data['usd'])),
                        'change_24h': Decimal(str(coin_data.get('usd_24h_change', 0))),
                        'volume_24h': Decimal(str(coin_data.get('usd_24h_vol', 0))),
                        'market_cap': Decimal(str(coin_data.get('usd_market_cap', 0)))
                    }

            return result
            
        except Exception as e:
            logger.error(f"Error fetching prices from CoinGecko: {e}")
            return {}
    
    def get_historical_prices(
        self,
        coingecko_id: str,
        days: int
    ) -> List[Dict]:
        """
        Fetch historical price data for a single cryptocurrency.

        Retrieves time-series price data from CoinGecko's market_chart endpoint
        with automatic interval selection based on requested timeframe.

        API Endpoint:
            GET /api/v3/coins/{id}/market_chart

        Args:
            coingecko_id (str): CoinGecko asset identifier (e.g., 'bitcoin', 'ethereum')
            days (int): Number of days of historical data to fetch

        Interval Selection:
            - days > 90: Daily intervals
            - days <= 90: Hourly intervals
            (Automatic granularity based on timeframe)

        Rate Limit Impact:
            Counts as 1 API call per invocation

        Returns:
            List[Dict]: Chronological list of price points:
                [
                    {
                        'timestamp': datetime (timezone-aware UTC),
                        'price': Decimal (USD)
                    },
                    ...
                ]
            Empty list on error (graceful degradation)

        Error Handling:
            - Network timeout (15s): Returns []
            - HTTP 404 (invalid coingecko_id): Returns [] and logs error
            - HTTP 429 (rate limit): Returns [] and logs error
            - Invalid data format: Returns [] and logs error

        Side Effects:
            - Logs errors to logger.error() on failures
            - No database writes
            - No caching (TODO)

        Notes:
            - Timestamps converted from UNIX ms to timezone-aware datetime (UTC)
            - All prices converted to Decimal for precision
            - Typically used for populating PriceHistory model
        """
        try:
            url = f"{self.BASE_URL}/coins/{coingecko_id}/market_chart"
            params = {
                'vs_currency': 'usd',
                'days': days,
                'interval': 'daily' if days > 90 else 'hourly'
            }
            
            response = self.session.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            prices = []
            for timestamp_ms, price in data.get('prices', []):
                # Convert to timezone-aware datetime (UTC)
                naive_dt = datetime.fromtimestamp(timestamp_ms / 1000)
                aware_dt = django_timezone.make_aware(naive_dt, django_timezone.utc)

                prices.append({
                    'timestamp': aware_dt,
                    'price': Decimal(str(price))
                })

            return prices
            
        except Exception as e:
            logger.error(f"Error fetching historical prices for {coingecko_id}: {e}")
            return []
    
    def get_coin_info(self, coingecko_id: str) -> Optional[Dict]:
        """Get detailed coin information including icon"""
        try:
            url = f"{self.BASE_URL}/coins/{coingecko_id}"
            params = {
                'localization': 'false',
                'tickers': 'false',
                'market_data': 'false',
                'community_data': 'false',
                'developer_data': 'false'
            }

            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            return {
                'name': data.get('name'),
                'symbol': data.get('symbol', '').upper(),
                'icon_url': data.get('image', {}).get('large', '')
            }

        except Exception as e:
            logger.error(f"Error fetching coin info for {coingecko_id}: {e}")
            return None