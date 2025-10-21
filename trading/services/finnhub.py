import requests
import time
import re
from django.conf import settings
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class FinnhubService:
    """Service for interacting with Finnhub API"""

    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self):
        self.api_key = settings.FINNHUB_API_KEY
        self.session = requests.Session()

    def get_crypto_news(self, limit: int = 20, min_id: Optional[int] = None) -> List[Dict]:
        """
        Fetch cryptocurrency news from Finnhub

        Args:
            limit: Number of articles to return (default 20)
            min_id: Optional minimum ID for incremental loads

        Returns:
            List of normalized news articles
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
