"""
Pytest configuration and shared fixtures for trading app tests.

Provides reusable fixtures for common test scenarios:
- Database setup with timezone awareness
- User/portfolio creation
- Sample cryptocurrencies
- Mocked external services (CoinGecko, yfinance, Finnhub)
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from freezegun import freeze_time
from trading.tests.factories import (
    UserFactory,
    PortfolioFactory,
    CryptocurrencyFactory,
    HoldingFactory,
    TransactionFactory,
    PriceHistoryFactory,
)


@pytest.fixture
def user():
    """Create a test user with default settings."""
    return UserFactory()


@pytest.fixture
def portfolio(user):
    """
    Create a portfolio for the test user.

    Initial state:
    - $10,000 cash balance
    - $10,000 initial investment
    - Created 30 days ago
    """
    return PortfolioFactory(user=user)


@pytest.fixture
def btc(db):
    """Create a Bitcoin cryptocurrency fixture with unique ID."""
    from trading.models import Cryptocurrency
    # Use get_or_create to prevent duplicates in the same test session
    crypto, created = Cryptocurrency.objects.get_or_create(
        symbol='BTC',
        defaults={
            'name': 'Bitcoin',
            'coingecko_id': 'bitcoin-test',
            'current_price': Decimal('50000.00'),
            'price_change_24h': Decimal('2.5'),
            'volume_24h': Decimal('1000000000.00'),
            'market_cap': Decimal('1000000000000.00'),
            'icon_url': 'https://example.com/btc.png',
            'category': Cryptocurrency.Category.CRYPTO,
            'is_active': True,
        }
    )
    # Ensure current_price is set even if crypto already existed
    if not created and crypto.current_price != Decimal('50000.00'):
        crypto.current_price = Decimal('50000.00')
        crypto.save()
    return crypto


@pytest.fixture
def eth(db):
    """Create an Ethereum cryptocurrency fixture with unique ID."""
    from trading.models import Cryptocurrency
    crypto, created = Cryptocurrency.objects.get_or_create(
        symbol='ETH',
        defaults={
            'name': 'Ethereum',
            'coingecko_id': 'ethereum-test',
            'current_price': Decimal('3000.00'),
            'price_change_24h': Decimal('-1.2'),
            'volume_24h': Decimal('500000000.00'),
            'market_cap': Decimal('500000000000.00'),
            'icon_url': 'https://example.com/eth.png',
            'category': Cryptocurrency.Category.CRYPTO,
            'is_active': True,
        }
    )
    # Ensure current_price is set even if crypto already existed
    if not created and crypto.current_price != Decimal('3000.00'):
        crypto.current_price = Decimal('3000.00')
        crypto.save()
    return crypto


@pytest.fixture
def usdc(db):
    """Create a USDC stablecoin fixture with unique ID."""
    from trading.models import Cryptocurrency
    crypto, created = Cryptocurrency.objects.get_or_create(
        symbol='USDC',
        defaults={
            'name': 'USD Coin',
            'coingecko_id': 'usd-coin-test',
            'current_price': Decimal('1.00'),
            'price_change_24h': Decimal('0.01'),
            'volume_24h': Decimal('100000000.00'),
            'market_cap': Decimal('50000000000.00'),
            'icon_url': 'https://example.com/usdc.png',
            'category': Cryptocurrency.Category.STABLECOIN,
            'is_active': True,
        }
    )
    # Ensure current_price is set even if crypto already existed
    if not created and crypto.current_price != Decimal('1.00'):
        crypto.current_price = Decimal('1.00')
        crypto.save()
    return crypto


@pytest.fixture
def active_cryptos(btc, eth, usdc):
    """Provide a list of active cryptocurrencies for testing."""
    return [btc, eth, usdc]


@pytest.fixture
def portfolio_with_holdings(portfolio, btc, eth):
    """
    Create a portfolio with existing holdings.

    Holdings:
    - 0.5 BTC @ $48,000 average
    - 2.0 ETH @ $2,900 average
    """
    HoldingFactory(
        portfolio=portfolio,
        cryptocurrency=btc,
        quantity=Decimal('0.5'),
        average_purchase_price=Decimal('48000.00'),
        total_cost_basis=Decimal('24000.00'),
    )
    HoldingFactory(
        portfolio=portfolio,
        cryptocurrency=eth,
        quantity=Decimal('2.0'),
        average_purchase_price=Decimal('2900.00'),
        total_cost_basis=Decimal('5800.00'),
    )
    # Adjust cash balance to reflect purchases
    portfolio.cash_balance = Decimal('10000.00') - Decimal('29800.00')  # Negative for testing edge cases
    portfolio.save()
    return portfolio


@pytest.fixture
def frozen_time():
    """
    Freeze time for deterministic timezone testing.

    Freezes to: 2025-01-15 12:00:00 UTC
    """
    with freeze_time('2025-01-15 12:00:00', tz_offset=0):
        yield timezone.now()


@pytest.fixture
def mock_coingecko():
    """
    Mock CoinGecko service responses.

    Provides success/failure scenarios for:
    - Price fetching
    - Historical data

    Use via service-level patching, not HTTP mocking.
    """
    from unittest.mock import Mock, patch

    mock_service = Mock()
    mock_service.get_historical_prices.return_value = [
        {'timestamp': '2025-01-10', 'price': 48000.00},
        {'timestamp': '2025-01-15', 'price': 50000.00},
    ]

    with patch('trading.services.coingecko.CoinGeckoService', return_value=mock_service):
        yield mock_service


@pytest.fixture
def mock_yfinance():
    """
    Mock YFinance service responses.

    Provides historical price data for cryptocurrencies.
    Use via service-level patching, not HTTP mocking.
    """
    from unittest.mock import Mock, patch

    mock_data = [
        {'date': '2025-01-01', 'price': 48000.00},
        {'date': '2025-01-15', 'price': 50000.00},
    ]

    with patch('trading.services.yfinance.YFinanceService.fetch_price_history', return_value=mock_data):
        yield mock_data


@pytest.fixture
def mock_finnhub():
    """
    Mock Finnhub service responses for crypto news.

    Provides sample news articles for testing.
    Use via service-level patching, not HTTP mocking.
    """
    from unittest.mock import Mock, patch

    mock_service = Mock()
    mock_service.get_crypto_news.return_value = [
        {
            'id': 1,
            'headline': 'Bitcoin Reaches New High',
            'summary': 'Bitcoin price surges past $50k',
            'source': 'CryptoNews',
            'url': 'https://example.com/news/1',
            'image': 'https://example.com/img/1.jpg',
            'datetime': 1705305600,
        }
    ]

    with patch('trading.services.finnhub.FinnhubService', return_value=mock_service):
        yield mock_service


@pytest.fixture
def api_client():
    """Django test client for API endpoint testing."""
    from django.test import Client
    return Client()


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.

    This fixture is autouse=True so all tests can access the database
    without explicitly requesting the 'db' fixture.
    """
    pass
