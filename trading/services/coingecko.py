import requests
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone as django_timezone
from django.conf import settings
from typing import Dict, List, Optional
import logging

# Create your services here.

logger = logging.getLogger(__name__)


class CoinGeckoService:
    """Service for interacting with CoinGecko API"""
    
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
        Fetch current prices for all supported cryptocurrencies
        
        Returns:
            Dict with symbol as key and price data as value
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
        Fetch historical prices for a cryptocurrency
        
        Args:
            coingecko_id: CoinGecko ID (e.g., 'bitcoin')
            days: Number of days of history
            
        Returns:
            List of {'timestamp': datetime, 'price': Decimal}
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