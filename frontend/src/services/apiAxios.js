/**
 * Axios API Service - Django Backend Communication Layer
 *
 * Centralized HTTP client for all API requests to Django backend using Axios.
 * Provides automatic error handling, request/response transformation, timeout
 * management, and cancel token support. All frontend components should use this
 * service instead of direct fetch() or axios calls.
 *
 * **Architecture:**
 * - Base URL: /api/trading (proxied to Django backend)
 * - Timeout: 10 seconds default (configurable per request)
 * - Content-Type: application/json (automatic serialization/deserialization)
 * - Interceptors: Request (auth prep), Response (error extraction)
 * - Cancel Support: AbortSignal and CancelToken for racing requests
 *
 * **Interceptors:**
 * 1. Request Interceptor:
 *    - Future: Add authentication tokens (config.headers.Authorization)
 *    - Currently: Pass-through (no auth in sandbox)
 * 2. Response Interceptor:
 *    - Success: Auto-unwraps response.data (returns payload directly)
 *    - 204 No Content: Returns null instead of empty response
 *    - Errors: Extracts backend error messages from payload.detail/message/error
 *    - Network: Translates ECONNABORTED → "Request timeout", ERR_NETWORK → "Network error"
 *    - Cancel: Re-throws axios.isCancel errors for cleanup
 *
 * **Error Handling:**
 * - Backend errors: Extracts Django error messages (detail, message, error fields)
 * - Timeout errors: "Request timeout - server took too long to respond"
 * - Network errors: "Network error - please check your connection"
 * - Cancel errors: Re-thrown as-is for component cleanup
 * - Generic errors: Fallback to error.message or "An unexpected error occurred"
 * - All errors thrown as Error objects (components use try/catch)
 *
 * **Request Cancellation:**
 * - AbortSignal: Modern approach (pass { signal } option to methods)
 * - CancelToken: Legacy approach (use createCancelToken() for older axios)
 * - Use cases:
 *   • Component unmount (cleanup pending requests)
 *   • Tab switching (cancel stale chart data fetches)
 *   • Search debouncing (cancel previous searches)
 *
 * **API Methods (Organized by Category):**
 *
 * Portfolio:
 * - getPortfolioSummary() → GET /portfolio/summary
 * - getPortfolioHistory(timeframe) → GET /portfolio/history?timeframe={1D,5D,1M,3M,6M,YTD}
 *
 * Holdings:
 * - getHoldings() → GET /holdings
 *
 * Cryptocurrencies:
 * - getCryptocurrencies() → GET /cryptocurrencies
 * - getCryptocurrencyDetail(cryptoId) → GET /cryptocurrencies/{id}
 *
 * Trading:
 * - executeBuy(cryptoId, amountUsd?, quantity?) → POST /trades/buy
 * - executeSell(cryptoId, amountUsd?, quantity?) → POST /trades/sell
 *
 * Transactions:
 * - getTransactions(page, type) → GET /transactions?page={page}&type={ALL|BUY|SELL}
 *
 * News:
 * - getCryptoNews(limit) → GET /news/crypto?limit={limit}
 *
 * Market Data:
 * - getPriceHistory(symbol, period, {signal}) → GET /price_history (yfinance)
 *   • Used by ViewChartModal for historical charts
 *   • symbol: BTC-USD, ETH-USD format (yfinance tickers)
 *   • period: 1d, 5d, 1mo, 3mo, 6mo, ytd, 1y, 5y, max
 * - getPriceHistoryTest(symbol, period, interval, {signal}) → GET /price_test
 *   • Test endpoint for development
 * - getCryptoPriceHistory(symbol, timeframe, {signal}) → GET /market/crypto/history
 *   • Alternative market endpoint (may be deprecated)
 *
 * User:
 * - getUserAccount() → GET /user/account
 *
 * **Usage Patterns:**
 *
 * Basic request:
 * ```javascript
 * import apiService from '../services/apiAxios';
 *
 * const data = await apiService.getCryptocurrencies();
 * // Returns array directly (response.data auto-unwrapped)
 * ```
 *
 * With error handling:
 * ```javascript
 * try {
 *   const portfolio = await apiService.getPortfolioSummary();
 * } catch (error) {
 *   // error.message contains user-friendly backend error or network error
 *   console.error('Failed to load portfolio:', error.message);
 * }
 * ```
 *
 * With cancellation (AbortController):
 * ```javascript
 * const abortController = new AbortController();
 * const history = await apiService.getPriceHistory('BTC-USD', '1y', {
 *   signal: abortController.signal
 * });
 * // Later: abortController.abort();
 * ```
 *
 * With cancellation (CancelToken - legacy):
 * ```javascript
 * const source = apiService.createCancelToken();
 * const history = await apiService.getPriceHistory('BTC-USD', '1y', {
 *   cancelToken: source.token
 * });
 * // Later: source.cancel('Operation canceled by user');
 * ```
 *
 * **Backend Integration:**
 * - Django Ninja REST API (trading/api.py)
 * - All endpoints documented in backend: trading/api.py (see Google-style docstrings)
 * - Schemas defined in: trading/schemas.py (Pydantic validation)
 * - Base URL configured in Vercel/Heroku proxy or dev server proxy
 *
 * **Development vs Production:**
 * - Development: Proxied via React dev server (package.json: "proxy": "http://localhost:8000")
 * - Production (Heroku): Both frontend and backend deployed together, /api routes to Django
 * - No CORS issues (same-origin or CORS configured in backend/settings.py)
 *
 * **Response Transformation:**
 * - All methods return Promise<data> (auto-unwrapped from axios response)
 * - 204 No Content → null
 * - Empty arrays/objects → [] or {} (not null)
 * - Error responses → throw Error with backend message
 *
 * **Timeout Behavior:**
 * - Default: 10 seconds (DEFAULT_TIMEOUT_MS)
 * - Triggers ECONNABORTED error → "Request timeout" message
 * - Override per request: apiClient.get(url, { timeout: 30000 })
 * - Use cases for longer timeouts:
 *   • Large price history fetches (5Y, MAX periods)
 *   • Slow yfinance API responses
 *
 * **Related Files:**
 * - trading/api.py: Backend endpoint implementations
 * - trading/schemas.py: Request/response schemas
 * - PortfolioContext.js: Uses executeBuy/executeSell for trades
 * - useCryptoNews.js: Uses getCryptoNews for news feed
 * - ViewChartModal.jsx: Uses getPriceHistory for price charts
 *
 * **Testing:**
 * - Mock apiService in component tests (jest.mock('../services/apiAxios'))
 * - Example: TradeModal.test.js mocks executeBuy/executeSell
 *
 * @module apiAxios
 * @see {@link https://axios-http.com/docs/intro|Axios Documentation}
 */
import axios from 'axios';

const API_BASE_URL = '/api/trading';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Create configured axios instance with interceptors
 *
 * Features:
 * - Automatic JSON handling
 * - 10s timeout
 * - Request/response interceptors
 * - Automatic error extraction
 * - Cancel token support
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - runs before every request
 */
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth tokens here in the future
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - runs after every response
 *
 * Handles:
 * - 204 No Content → returns null
 * - Error responses → extracts backend error message
 */
apiClient.interceptors.response.use(
  (response) => {
    // Handle 204 No Content gracefully
    if (response.status === 204) {
      return null;
    }
    return response.data;
  },
  (error) => {
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - server took too long to respond');
    }

    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error - please check your connection');
    }

    // Handle axios cancellation
    if (axios.isCancel(error)) {
      throw error; // Re-throw cancel errors as-is
    }

    // Extract backend error message
    if (error.response) {
      const payload = error.response.data;
      const msg =
        (payload && (payload.detail || payload.message || payload.error)) ||
        `Request failed (${error.response.status})`;
      throw new Error(msg);
    }

    // Generic error
    throw new Error(error.message || 'An unexpected error occurred');
  }
);

class ApiService {
  // Portfolio endpoints
  async getPortfolioSummary() {
    return apiClient.get('/portfolio/summary');
  }

  async getPortfolioHistory(timeframe = '1M') {
    return apiClient.get('/portfolio/history', {
      params: { timeframe },
    });
  }

  // Holdings endpoints
  async getHoldings() {
    return apiClient.get('/holdings');
  }

  // Cryptocurrency endpoints
  async getCryptocurrencies() {
    return apiClient.get('/cryptocurrencies');
  }

  async getCryptocurrencyDetail(cryptoId) {
    return apiClient.get(`/cryptocurrencies/${encodeURIComponent(cryptoId)}`);
  }

  // Trading endpoints
  async executeBuy(cryptocurrencyId, amountUsd = null, quantity = null) {
    return apiClient.post('/trades/buy', {
      cryptocurrency_id: cryptocurrencyId,
      amount_usd: amountUsd,
      quantity,
    });
  }

  async executeSell(cryptocurrencyId, amountUsd = null, quantity = null) {
    return apiClient.post('/trades/sell', {
      cryptocurrency_id: cryptocurrencyId,
      amount_usd: amountUsd,
      quantity,
    });
  }

  // Transaction endpoints
  async getTransactions(page = 1, type = 'ALL') {
    return apiClient.get('/transactions', {
      params: { page, type },
    });
  }

  // News endpoints
  async getCryptoNews(limit = 20) {
    return apiClient.get('/news/crypto', {
      params: { limit },
    });
  }

  /**
   * Market endpoints - Get cryptocurrency price history
   *
   * @param {string} symbol - Crypto symbol (e.g., 'BTC', 'ETH', 'SOL')
   * @param {string} timeframe - Timeframe (1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, ALL)
   * @param {object} options - Additional options
   * @param {AbortSignal} options.signal - AbortSignal for request cancellation
   * @returns {Promise<Array>} Array of price points with date, price, optional timestamp
   */
  async getCryptoPriceHistory(symbol, timeframe = '1Y', { signal } = {}) {
    try {
      const data = await apiClient.get('/market/crypto/history', {
        params: { symbol, timeframe },
        signal, // Axios supports AbortSignal in newer versions
      });

      // Backend may return null for no data; normalize to []
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // If it's a cancel error, don't transform it
      if (axios.isCancel(error) || error.name === 'CanceledError') {
        throw error;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Price History endpoint (new - uses /price_test)
   *
   * @param {string} symbol - yfinance ticker symbol (e.g., 'BTC-USD', 'ETH-USD')
   * @param {string} period - Period (1d, 5d, 1mo, 3mo, 6mo, ytd, 1y, 5y, max)
   * @param {object} options - Additional options
   * @param {AbortSignal} options.signal - AbortSignal for request cancellation
   * @returns {Promise<Object>} Object with { symbol, period, interval, count, data }
   */
  async getPriceHistory(symbol, period = '1y', { signal } = {}) {
    try {
      const response = await apiClient.get('/price_history', {
        params: { symbol, period, interval: '1d' },
        signal,
      });

      // Response is already unwrapped by interceptor
      return response || { count: 0, data: [] };
    } catch (error) {
      // Re-throw cancel errors
      if (axios.isCancel(error) || error.name === 'CanceledError') {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Price History TEST endpoint (uses /price_test for testing)
   *
   * @param {string} symbol - yfinance ticker symbol (e.g., 'BTC-USD', 'ETH-USD')
   * @param {string} period - Period (1d, 5d, 1mo, 3mo, 6mo, ytd, 1y, 5y, max)
   * @param {string} interval - Interval override (optional, defaults based on period)
   * @param {object} options - Additional options
   * @param {AbortSignal} options.signal - AbortSignal for request cancellation
   * @returns {Promise<Object>} Object with { symbol, period, interval, count, data }
   */
  async getPriceHistoryTest(symbol, period = '1y', interval = '1d', { signal } = {}) {
    try {
      const response = await apiClient.get('/price_test', {
        params: { symbol, period, interval },
        signal,
      });

      // Response is already unwrapped by interceptor
      return response || { count: 0, data: [] };
    } catch (error) {
      // Re-throw cancel errors
      if (axios.isCancel(error) || error.name === 'CanceledError') {
        throw error;
      }
      throw error;
    }
  }

  // User endpoints
  async getUserAccount() {
    return apiClient.get('/user/account');
  }

  /**
   * Create a cancel token source for manual request cancellation
   * (Alternative to AbortController for older axios versions)
   *
   * @returns {CancelTokenSource}
   * @example
   * const source = apiService.createCancelToken();
   * apiService.getCryptoPriceHistory('BTC', '1Y', { cancelToken: source.token });
   * // Later: source.cancel('Operation canceled by user');
   */
  createCancelToken() {
    return axios.CancelToken.source();
  }
}

// Export singleton instance
export default new ApiService();

// Also export axios instance for advanced usage
export { apiClient };
