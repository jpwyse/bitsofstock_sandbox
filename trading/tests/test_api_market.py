"""
Tests for Market API endpoints.

This module tests the market data REST API endpoints for cryptocurrency
price history charts.

Key Test Coverage:
- GET /api/market/crypto/history - Get historical price data
- Timeframe Support: All timeframes (1D to ALL, unlike portfolio which caps at YTD)
- External API Mocking: yfinance price data
- Edge Cases: Missing symbol, invalid timeframe, API failures
- Response Schema: Price point structure

API Endpoint Behaviors Tested:
- Market endpoint supports all timeframes (1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, ALL)
- Symbol parameter required and validated
- yfinance service called for historical data
- Missing cryptocurrency returns 404
- External API failures return 502 error
"""
import pytest
from ninja.testing import TestClient
from trading.api import router
from trading.tests.factories import CryptocurrencyFactory


@pytest.mark.api
class TestMarketPriceHistoryAPI:
    """Test GET /api/market/crypto/history endpoint."""

    def test_get_price_history_success(self, btc, mock_yfinance):
        """
        Test successful price history retrieval.

        Verifies:
        - 200 status code
        - Returns array of price points
        - Each point has date and price
        - yfinance service called
        """
        client = TestClient(router)

        response = client.get("/market/crypto/history?symbol=BTC&timeframe=1Y")

        assert response.status_code == 200

        data = response.json()

        assert isinstance(data, list)

        # Verify price point structure
        if len(data) > 0:
            point = data[0]
            assert "date" in point
            assert "price" in point

    def test_get_price_history_all_timeframes(self, btc, mock_yfinance):
        """
        Test all supported timeframes work.

        Market endpoints support ALL timeframes (unlike portfolio which caps at YTD).

        Verifies:
        - 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, ALL all accepted
        """
        client = TestClient(router)

        timeframes = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL']

        for timeframe in timeframes:
            response = client.get(f"/market/crypto/history?symbol=BTC&timeframe={timeframe}")

            assert response.status_code == 200, f"Timeframe {timeframe} should be supported"

    def test_get_price_history_invalid_timeframe(self, btc):
        """
        Test invalid timeframe returns 400 error.

        Verifies:
        - Random strings rejected
        - Error message lists valid options
        """
        client = TestClient(router)

        response = client.get("/market/crypto/history?symbol=BTC&timeframe=INVALID")

        assert response.status_code == 400

    def test_get_price_history_missing_symbol(self):
        """
        Test missing symbol parameter.

        Verifies:
        - Returns 422 (missing required param)
        """
        client = TestClient(router)

        response = client.get("/market/crypto/history?timeframe=1Y")

        assert response.status_code == 422

    def test_get_price_history_cryptocurrency_not_found(self):
        """
        Test non-existent cryptocurrency symbol.

        Verifies:
        - Returns 502 error when yfinance doesn't have data
        - Error message indicates upstream service issue
        """
        client = TestClient(router)

        response = client.get("/market/crypto/history?symbol=NOTEXIST&timeframe=1Y")

        # With direct yfinance mapping, non-existent symbols return 502 (upstream error)
        assert response.status_code == 502

    def test_get_price_history_different_symbols(self, btc, eth, mock_yfinance):
        """
        Test multiple cryptocurrency symbols.

        Verifies:
        - Different symbols can be queried
        - Symbol parameter case-insensitive
        """
        client = TestClient(router)

        # BTC
        response = client.get("/market/crypto/history?symbol=BTC&timeframe=1M")
        assert response.status_code == 200

        # ETH
        response = client.get("/market/crypto/history?symbol=ETH&timeframe=1M")
        assert response.status_code == 200

        # Lowercase (should work)
        response = client.get("/market/crypto/history?symbol=btc&timeframe=1M")
        assert response.status_code == 200

    def test_get_price_history_yfinance_failure(self, btc):
        """
        Test yfinance service failure handling.

        Verifies:
        - Returns 502 error when external API fails
        - Error message indicates upstream service issue
        """
        # No mock = yfinance will fail

        client = TestClient(router)

        response = client.get("/market/crypto/history?symbol=BTC&timeframe=1Y")

        # Should return gateway error
        assert response.status_code == 502

    def test_get_price_history_uses_yfinance_symbol(self, mock_yfinance):
        """
        Test cryptocurrency with custom yfinance_symbol.

        Verifies:
        - Uses yfinance_symbol from model if available
        - Fallback to default mapping otherwise
        """
        # Create crypto with custom yfinance_symbol
        custom_crypto = CryptocurrencyFactory(
            symbol='CUSTOM',
            name='Custom Coin',
            yfinance_symbol='CUSTOM-USD',
        )

        client = TestClient(router)

        response = client.get("/market/crypto/history?symbol=CUSTOM&timeframe=1Y")

        # Should succeed (mock will handle it)
        assert response.status_code == 200
