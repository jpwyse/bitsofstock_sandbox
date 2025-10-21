// API service using Axios for communicating with Django backend

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
