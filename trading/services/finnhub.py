"""
Finnhub API integration service for cryptocurrency news articles.

This module provides a service layer for fetching the latest cryptocurrency news
from the Finnhub API. Includes automatic retry logic, HTML sanitization, and
article normalization.

External API:
    Finnhub Stock API v1 (https://finnhub.io/docs/api)

Rate Limits:
    - Free tier: 60 calls/minute, 30 calls/second
    - Premium tier: Higher limits with API key
    - Rate limit headers: X-Ratelimit-Limit, X-Ratelimit-Remaining, X-Ratelimit-Reset
    - Exceeded: Returns HTTP 429 Too Many Requests

Error Handling:
    - Network timeouts: 10 second timeout on requests
    - HTTP errors: Automatic retry with exponential backoff (max 1 retry)
    - Invalid responses: Logged and skipped (partial data returned)
    - Missing required fields: Articles skipped with warning log

Retry Logic:
    - Max retries: 1 (2 total attempts)
    - Backoff strategy: Exponential (2^attempt seconds)
    - Retryable errors: All requests.exceptions.RequestException

Data Sanitization:
    - HTML tags stripped from summary field
    - HTML entities decoded (e.g., &nbsp; → space)
    - Extra whitespace normalized

Dependencies:
    - requests: HTTP client
    - django.conf.settings: API key configuration
"""
import requests
import time
import re
from django.conf import settings
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class FinnhubService:
    """
    Finnhub API client for cryptocurrency news.

    Provides methods for fetching and normalizing cryptocurrency news articles
    from the Finnhub API with automatic retry logic and HTML sanitization.

    Attributes:
        BASE_URL (str): Finnhub API base URL
        api_key (str): API key from Django settings
        session (requests.Session): HTTP session for connection pooling

    Rate Limits:
        - Free tier: 60 calls/minute, 30 calls/second
        - Counts against account-wide rate limit

    Methods:
        get_crypto_news(limit, min_id): Fetch latest crypto news articles

    Error Handling:
        - Retries failed requests once with exponential backoff
        - Skips invalid articles (missing required fields)
        - Logs all errors and warnings
    """

    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self):
        self.api_key = settings.FINNHUB_API_KEY
        self.session = requests.Session()

    def get_crypto_news(self, limit: int = 20, min_id: Optional[int] = None) -> List[Dict]:
        """
        Fetch latest cryptocurrency news articles from Finnhub.

        Retrieves crypto news from Finnhub's /news endpoint, filters, sorts, and
        normalizes the data for client consumption. Includes automatic retry logic
        and HTML sanitization.

        API Endpoint:
            GET /api/v1/news?category=crypto

        Args:
            limit (int): Maximum number of articles to return (default 20)
            min_id (int, optional): Minimum article ID for incremental updates.
                                    Articles with ID <= min_id are filtered out.

        Rate Limit Impact:
            Counts as 1 API call per invocation

        Returns:
            List[Dict]: Sorted list of normalized articles (newest first):
                [
                    {
                        'id': int,                # Unique article identifier
                        'datetime': int,          # UNIX timestamp (seconds)
                        'headline': str,          # Article title
                        'image': str,             # Image URL (may be empty)
                        'summary': str,           # Sanitized article summary (HTML stripped)
                        'url': str,               # Article URL
                        'source': str             # News source (may be empty)
                    },
                    ...
                ]

        Error Handling:
            - HTTP errors: Retried once, then re-raised
            - Invalid articles (missing required fields): Skipped with warning log
            - Network timeout (10s): Retried once, then raised
            - Empty response: Returns []

        Side Effects:
            - Logs warnings for invalid articles
            - Logs errors for request failures
            - Re-raises exceptions on final failure (after retries)

        Sorting:
            Articles sorted by datetime descending (newest first)

        Sanitization:
            - HTML tags removed from summary
            - HTML entities decoded
            - Whitespace normalized

        Notes:
            - Used by /news/crypto API endpoint
            - Frontend caches results for 24 hours (localStorage)
            - Articles may be duplicated across requests (use min_id for deduplication)
        """
        try:
            url = f"{self.BASE_URL}/news"
            params = {
                'category': 'crypto',
                'token': self.api_key
            }

            # Make initial request
            response = self._make_request_with_retry(url, params)

            if not response:
                return []

            articles = response

            # Filter by min_id if provided
            if min_id:
                articles = [a for a in articles if a.get('id', 0) > min_id]

            # Sort by datetime (newest first) and limit
            articles.sort(key=lambda x: x.get('datetime', 0), reverse=True)
            articles = articles[:limit]

            # Normalize and sanitize
            normalized = []
            for article in articles:
                normalized_article = self._normalize_article(article)
                if normalized_article:
                    normalized.append(normalized_article)

            return normalized

        except Exception as e:
            logger.error(f"Error fetching crypto news from Finnhub: {e}")
            raise

    def _make_request_with_retry(self, url: str, params: dict, max_retries: int = 1) -> Optional[List]:
        """
        Make HTTP request with exponential backoff retry

        Args:
            url: Request URL
            params: Query parameters
            max_retries: Maximum number of retries (default 1)

        Returns:
            Response JSON or None on failure
        """
        for attempt in range(max_retries + 1):
            try:
                response = self.session.get(url, params=params, timeout=10)
                response.raise_for_status()
                return response.json()

            except requests.exceptions.RequestException as e:
                if attempt < max_retries:
                    # Exponential backoff: 2^attempt seconds
                    wait_time = 2 ** attempt
                    logger.warning(f"Finnhub request failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Finnhub request failed after {max_retries + 1} attempts: {e}")
                    raise

        return None

    def _normalize_article(self, article: dict) -> Optional[Dict]:
        """
        Normalize and sanitize article data

        Args:
            article: Raw article data from Finnhub

        Returns:
            Normalized article dict or None if invalid
        """
        try:
            # Extract required fields
            article_id = article.get('id')
            datetime_unix = article.get('datetime')
            headline = article.get('headline')
            url = article.get('url')

            # Validate required fields
            if not all([article_id, datetime_unix, headline, url]):
                logger.warning(f"Skipping article with missing required fields: {article}")
                return None

            # Sanitize summary (strip HTML tags)
            summary = article.get('summary', '')
            summary = self._sanitize_html(summary)

            # Get optional fields
            image = article.get('image', '')
            source = article.get('source', '')

            return {
                'id': article_id,
                'datetime': datetime_unix,
                'headline': headline,
                'image': image,
                'summary': summary,
                'url': url,
                'source': source
            }

        except Exception as e:
            logger.warning(f"Error normalizing article: {e}")
            return None

    def _sanitize_html(self, text: str) -> str:
        """
        Remove HTML tags from text

        Args:
            text: Text potentially containing HTML

        Returns:
            Sanitized text
        """
        if not text:
            return ''

        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Decode HTML entities
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        text = text.replace('&#39;', "'")

        # Remove extra whitespace
        text = ' '.join(text.split())

        return text.strip()
