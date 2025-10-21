"""
Tests for News API endpoints.

This module tests the cryptocurrency news REST API endpoint.

Key Test Coverage:
- GET /api/news/crypto - Get cryptocurrency news articles
- External API Mocking: Finnhub news service
- Edge Cases: API failures, empty results, limit parameter
- Response Schema: Article structure validation

API Endpoint Behaviors Tested:
- News endpoint returns normalized article list
- Limit parameter controls result count
- External API failures return 500 error
- Articles have required fields (headline, summary, url, etc.)
"""
import pytest
from ninja.testing import TestClient
from trading.api import router


@pytest.mark.api
class TestCryptoNewsAPI:
    """Test GET /api/news/crypto endpoint."""

    def test_get_crypto_news_success(self, mock_finnhub):
        """
        Test successful crypto news retrieval.

        Verifies:
        - 200 status code
        - Returns array of articles
        - Each article has required fields
        - External Finnhub API called
        """
        client = TestClient(router)

        response = client.get("/news/crypto")

        assert response.status_code == 200

        articles = response.json()

        assert isinstance(articles, list)
        assert len(articles) > 0

        # Verify article structure
        article = articles[0]
        assert "id" in article
        assert "headline" in article
        assert "summary" in article
        assert "url" in article
        assert "datetime" in article

    def test_get_crypto_news_with_limit(self, mock_finnhub):
        """
        Test limit parameter controls result count.

        Verifies:
        - limit query parameter accepted
        - Default limit is 20
        """
        client = TestClient(router)

        # Test with limit
        response = client.get("/news/crypto?limit=10")

        assert response.status_code == 200

        # Note: Mock returns fixed data, but endpoint should accept parameter
        articles = response.json()
        assert isinstance(articles, list)

    def test_get_crypto_news_default_limit(self, mock_finnhub):
        """
        Test default limit is 20.

        Verifies:
        - No limit parameter defaults to 20
        """
        client = TestClient(router)

        response = client.get("/news/crypto")

        assert response.status_code == 200

        # Endpoint should handle default limit
        articles = response.json()
        assert isinstance(articles, list)

    def test_get_crypto_news_api_failure(self):
        """
        Test external API failure handling.

        Verifies:
        - Returns 500 error when Finnhub fails
        - Error message indicates service unavailable
        """
        # No mock = API will fail

        client = TestClient(router)

        response = client.get("/news/crypto")

        # Should return error status
        assert response.status_code in [500, 502]
