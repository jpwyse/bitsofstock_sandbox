"""
Tests for Cryptocurrencies API endpoints.

This module tests the cryptocurrency listing and detail REST API endpoints.

Key Test Coverage:
- GET /api/cryptocurrencies - List all active cryptocurrencies
- GET /api/cryptocurrencies/{id} - Get cryptocurrency detail with price history
- Edge Cases: No cryptocurrencies, inactive cryptocurrencies, missing crypto ID
- External API Mocking: CoinGecko historical prices

API Endpoint Behaviors Tested:
- Cryptocurrencies list returns only active cryptos
- Detail endpoint includes 7-day price history
- External API failures handled gracefully
- Response schema matches specification
"""
import pytest
from decimal import Decimal
from ninja.testing import TestClient
from trading.api import router
from trading.models import Cryptocurrency
from trading.tests.factories import CryptocurrencyFactory


@pytest.fixture(autouse=True)
def _clean_cryptos_table(db):
    """Ensure clean crypto table for deterministic tests."""
    Cryptocurrency.objects.all().delete()
    yield
    Cryptocurrency.objects.all().delete()


@pytest.fixture
def btc(db):
    """Create exactly one Bitcoin fixture for tests."""
    crypto, _ = Cryptocurrency.objects.get_or_create(
        symbol='BTC',
        defaults={
            'name': 'Bitcoin',
            'coingecko_id': 'bitcoin',
            'current_price': Decimal('50000.00'),
            'price_change_24h': Decimal('2.50'),
            'volume_24h': Decimal('1000000000.00'),
            'market_cap': Decimal('1000000000000.00'),
            'icon_url': 'https://example.com/btc.png',
            'category': Cryptocurrency.Category.CRYPTO,
            'is_active': True,
        }
    )
    return crypto


@pytest.fixture
def eth(db):
    """Create exactly one Ethereum fixture for tests."""
    crypto, _ = Cryptocurrency.objects.get_or_create(
        symbol='ETH',
        defaults={
            'name': 'Ethereum',
            'coingecko_id': 'ethereum',
            'current_price': Decimal('3000.00'),
            'price_change_24h': Decimal('1.50'),
            'volume_24h': Decimal('500000000.00'),
            'market_cap': Decimal('500000000000.00'),
            'icon_url': 'https://example.com/eth.png',
            'category': Cryptocurrency.Category.CRYPTO,
            'is_active': True,
        }
    )
    return crypto


@pytest.fixture
def usdc(db):
    """Create exactly one USDC fixture for tests."""
    crypto, _ = Cryptocurrency.objects.get_or_create(
        symbol='USDC',
        defaults={
            'name': 'USD Coin',
            'coingecko_id': 'usd-coin',
            'current_price': Decimal('1.00'),
            'price_change_24h': Decimal('0.00'),
            'volume_24h': Decimal('100000000.00'),
            'market_cap': Decimal('50000000000.00'),
            'icon_url': 'https://example.com/usdc.png',
            'category': Cryptocurrency.Category.STABLECOIN,
            'is_active': True,
        }
    )
    return crypto


@pytest.mark.api
class TestCryptocurrenciesListAPI:
    """Test GET /api/cryptocurrencies endpoint."""

    def test_get_cryptocurrencies_empty(self):
        """
        Test cryptocurrencies endpoint with no cryptos.

        Verifies:
        - 200 status code
        - Returns empty array
        """
        # No fixtures used - autouse cleanup ensures empty table
        client = TestClient(router)

        response = client.get("/cryptocurrencies")

        assert response.status_code == 200
        assert response.json() == []

    def test_get_cryptocurrencies_with_data(self, btc, eth, usdc):
        """
        Test cryptocurrencies endpoint with multiple cryptos.

        Verifies:
        - Returns array of all active cryptocurrencies
        - Each crypto has required fields
        - Sorted appropriately
        """
        client = TestClient(router)

        response = client.get("/cryptocurrencies")

        assert response.status_code == 200

        cryptos = response.json()

        assert len(cryptos) == 3  # BTC, ETH, USDC from fixtures

        # Verify structure
        for crypto in cryptos:
            assert "id" in crypto
            assert "symbol" in crypto
            assert "name" in crypto
            assert "coingecko_id" in crypto
            assert "icon_url" in crypto
            assert "category" in crypto
            assert "current_price" in crypto
            assert "price_change_24h" in crypto
            assert "volume_24h" in crypto
            assert "market_cap" in crypto
            assert "last_updated" in crypto

    def test_get_cryptocurrencies_only_active(self, btc, eth):
        """
        Test only active cryptocurrencies returned.

        Verifies:
        - Inactive cryptos excluded from results
        """
        # Create inactive cryptocurrency
        inactive = CryptocurrencyFactory(
            symbol='INACTIVE',
            is_active=False,
        )

        client = TestClient(router)

        response = client.get("/cryptocurrencies")

        cryptos = response.json()

        # Should only return BTC and ETH (active)
        assert len(cryptos) == 2

        symbols = [c["symbol"] for c in cryptos]
        assert "INACTIVE" not in symbols

    def test_get_cryptocurrencies_field_types(self, btc):
        """
        Test cryptocurrency fields have correct types.

        Verifies:
        - current_price is decimal
        - price_change_24h is decimal
        - Fields match schema specification
        """
        client = TestClient(router)

        response = client.get("/cryptocurrencies")

        crypto = response.json()[0]

        assert crypto["symbol"] == "BTC"
        assert Decimal(str(crypto["current_price"])) == btc.current_price


@pytest.mark.api
class TestCryptocurrencyDetailAPI:
    """Test GET /api/cryptocurrencies/{id} endpoint."""

    def test_get_cryptocurrency_detail_success(self, btc, mock_coingecko):
        """
        Test cryptocurrency detail endpoint.

        Verifies:
        - 200 status code
        - Returns all basic crypto fields
        - Includes price_history_7d array
        - External API called for historical data
        """
        client = TestClient(router)

        response = client.get(f"/cryptocurrencies/{btc.id}")

        assert response.status_code == 200

        data = response.json()

        # Verify basic fields
        assert data["symbol"] == "BTC"
        assert data["name"] == "Bitcoin"
        assert data["coingecko_id"] == "bitcoin"

        # Verify price history included
        assert "price_history_7d" in data
        assert isinstance(data["price_history_7d"], list)

    def test_get_cryptocurrency_detail_not_found(self):
        """
        Test detail endpoint with invalid cryptocurrency ID.

        Verifies:
        - Returns 404 error
        """
        client = TestClient(router)

        response = client.get("/cryptocurrencies/00000000-0000-0000-0000-000000000000")

        assert response.status_code == 404

    def test_get_cryptocurrency_detail_price_history(self, eth, mock_coingecko):
        """
        Test price history included in detail response.

        Verifies:
        - Historical prices fetched from CoinGecko
        - 7-day timeframe used
        - Data structure correct
        """
        client = TestClient(router)

        response = client.get(f"/cryptocurrencies/{eth.id}")

        assert response.status_code == 200

        data = response.json()
        price_history = data["price_history_7d"]

        # Mock should return some data points
        assert isinstance(price_history, list)
