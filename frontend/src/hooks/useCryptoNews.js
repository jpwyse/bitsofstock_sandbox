/**
 * useCryptoNews Hook - Cryptocurrency News Feed with 24-Hour Caching
 *
 * Custom React hook for fetching and managing cryptocurrency news articles from Finnhub
 * with localStorage caching to minimize API calls and improve performance. Implements
 * 24-hour cache expiration and manual refresh capability.
 *
 * **Features:**
 * - 24-Hour Cache: News stored in localStorage for 24 hours
 * - Cache-First Strategy: Always checks cache before hitting API
 * - Manual Refresh: Force API fetch via refetch() function
 * - Error Handling: Graceful degradation with error state
 * - Loading State: Boolean indicator for API fetch status
 *
 * **Caching Strategy:**
 * - Cache Key: 'crypto_news_cache' (localStorage)
 * - Cache Duration: 24 hours (CACHE_DURATION = 24 * 60 * 60 * 1000 ms)
 * - Cache Structure: { data: [...articles], timestamp: Date.now() }
 * - Cache Validation: Checks if (now - timestamp) < CACHE_DURATION
 * - Cache Invalidation:
 *   • Auto: After 24 hours (stale cache ignored, fresh API fetch)
 *   • Manual: refetch() forces API call regardless of cache age
 *   • localStorage errors: Falls back to API fetch
 *
 * **Finnhub Rate Limits:**
 * - Free Tier: 60 calls/minute
 * - Caching reduces API calls significantly (1 call per 24 hours per user)
 * - Backend endpoint: GET /api/trading/news/crypto?limit={limit}
 * - Backend proxies to Finnhub: https://finnhub.io/api/v1/news?category=crypto
 *
 * **API Response Structure:**
 * Each article contains:
 * - id: Unique article ID
 * - headline: Article title
 * - summary: Article summary text
 * - source: News source (e.g., "Coindesk", "CoinTelegraph")
 * - url: External article link
 * - datetime: Unix timestamp (seconds)
 * - image: Article image URL
 * - category: "cryptocurrency"
 *
 * **State Management:**
 * - articles: Array of news articles (empty [] on initial load or error)
 * - loading: Boolean (true during API fetch, false after cache/success/error)
 * - error: Error message string (null if no error)
 * - refetch: Function to force fresh API fetch (ignores cache)
 *
 * **Cache Loading Flow:**
 * 1. Component mounts → useEffect triggers fetchNews(false)
 * 2. fetchNews checks loadFromCache()
 * 3. If cache valid (<24h): setArticles(cachedData), setLoading(false), DONE
 * 4. If cache invalid or missing: Fetch from API
 * 5. On API success: setArticles(data), saveToCache(data)
 * 6. On API error: setError(message), articles remain empty
 *
 * **Manual Refresh Flow:**
 * 1. User clicks refresh button → calls refetch()
 * 2. refetch() calls fetchNews(true)
 * 3. forceRefresh=true skips cache check
 * 4. Always fetches from API
 * 5. Updates cache with fresh data
 *
 * **Error Handling:**
 * - localStorage errors (quota exceeded, browser restrictions): Logs error, falls back to API
 * - API errors (network, timeout, 429 rate limit): setError(message), loading=false
 * - Cache parse errors: Logs error, falls back to API
 * - No retry logic: User must manually refetch or wait for next mount
 *
 * **Performance Benefits:**
 * - Reduces Finnhub API calls from ~1000/day to ~1/day per user
 * - Instant load from cache (no network latency)
 * - Persists across page refreshes and tab closes
 * - No server load for cached requests
 *
 * **Usage Pattern:**
 * ```javascript
 * import { useCryptoNews } from '../hooks/useCryptoNews';
 *
 * function NewsComponent() {
 *   const { articles, loading, error, refetch } = useCryptoNews(20);
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Alert severity="error">{error}</Alert>;
 *
 *   return (
 *     <div>
 *       <Button onClick={refetch}>Refresh News</Button>
 *       {articles.map(article => (
 *         <NewsCard key={article.id} article={article} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * **Integration with Components:**
 * - CryptoNewsList.jsx: Renders articles in card grid
 * - News.js: Parent page with portfolio snapshot + news feed
 * - onRefetchReady callback: Passes refetch function to parent for refresh button
 *
 * **Related Files:**
 * - ../services/apiAxios.js: HTTP client with getCryptoNews(limit) method
 * - ../components/CryptoNewsList.jsx: News article display component
 * - ../pages/News.js: Parent page integrating news feed
 *
 * **Backend Integration:**
 * - Endpoint: GET /api/trading/news/crypto?limit={limit}
 * - Implementation: trading/api.py:get_crypto_news()
 * - Finnhub API: Proxied with backend API key
 * - HTML sanitization: Backend sanitizes summary/headline before response
 *
 * **Limitations:**
 * - Cache shared across all tabs (same localStorage)
 * - No per-user cache isolation (sandbox assumes single user)
 * - No cache size limit (Finnhub returns max ~50 articles)
 * - No offline detection (API errors shown even if cache available)
 *
 * @module useCryptoNews
 * @requires react
 * @requires ../services/apiAxios
 * @param {number} limit - Maximum number of articles to fetch (default 20, max 100)
 * @returns {Object} Hook state and methods
 * @returns {Array} return.articles - Array of news articles (empty on initial/error)
 * @returns {boolean} return.loading - True during API fetch, false otherwise
 * @returns {string|null} return.error - Error message or null
 * @returns {Function} return.refetch - Force refresh from API (ignores cache)
 * @example
 * const { articles, loading, error, refetch } = useCryptoNews(20);
 */
import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiAxios';

const CACHE_KEY = 'crypto_news_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
export const useCryptoNews = (limit = 20) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load cached data from localStorage
  const loadFromCache = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = Date.now();

        // Check if cache is still valid (less than 24 hours old)
        if (now - timestamp < CACHE_DURATION) {
          setArticles(data);
          setLoading(false);
          return true;
        }
      }
    } catch (err) {
      console.error('Error loading cached news:', err);
    }
    return false;
  }, []);

  // Save data to localStorage cache
  const saveToCache = useCallback((data) => {
    try {
      const cacheObject = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    } catch (err) {
      console.error('Error saving news to cache:', err);
    }
  }, []);

  // Fetch fresh news from API
  const fetchNews = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // If not forcing refresh, try to load from cache first
      if (!forceRefresh && loadFromCache()) {
        return;
      }

      // Fetch fresh data from API
      const data = await apiService.getCryptoNews(limit);
      setArticles(data);
      saveToCache(data);
    } catch (err) {
      console.error('Error fetching crypto news:', err);
      setError(err.message || 'Failed to fetch crypto news');
    } finally {
      setLoading(false);
    }
  }, [limit, loadFromCache, saveToCache]);

  // Force refresh function for the refresh button
  const refetch = useCallback(() => {
    fetchNews(true);
  }, [fetchNews]);

  // Initial load - check cache first
  useEffect(() => {
    fetchNews(false);
  }, [fetchNews]);

  return {
    articles,
    loading,
    error,
    refetch,
  };
};
