// API service for communicating with Django backend

const API_BASE_URL = '/api/trading';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Centralized request helper with robust error handling
 *
 * Features:
 * - Automatic query param encoding
 * - 10s timeout with AbortController
 * - Graceful 204 No Content handling
 * - Backend error message extraction
 * - AbortSignal support for cancellable requests
 */
async function request(path, { method = 'GET', params = {}, body, signal } = {}) {
  // Build URL with proper query param encoding
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  // Setup timeout with AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const finalSignal = signal || controller.signal;

  try {
    const res = await fetch(url.toString(), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: finalSignal,
    });

    // Handle 204 No Content gracefully
    if (res.status === 204) return null;

    const text = await res.text();
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const payload = text && isJson ? JSON.parse(text) : (text || null);

    // Extract backend error message
    if (!res.ok) {
      const msg =
        (payload && (payload.detail || payload.message || payload.error)) ||
        `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

class ApiService {
  // Portfolio endpoints
  async getPortfolioSummary() {
    return request('/portfolio/summary');
  }

  async getPortfolioHistory(timeframe = '1M') {
    return request('/portfolio/history', { params: { timeframe } });
  }

  // Holdings endpoints
  async getHoldings() {
    return request('/holdings');
  }

  // Cryptocurrency endpoints
  async getCryptocurrencies() {
    return request('/cryptocurrencies');
  }

  async getCryptocurrencyDetail(cryptoId) {
    return request(`/cryptocurrencies/${encodeURIComponent(cryptoId)}`);
  }

  // Trading endpoints
  async executeBuy(cryptocurrencyId, amountUsd = null, quantity = null) {
    return request('/trades/buy', {
      method: 'POST',
      body: { cryptocurrency_id: cryptocurrencyId, amount_usd: amountUsd, quantity },
    });
  }

  async executeSell(cryptocurrencyId, amountUsd = null, quantity = null) {
    return request('/trades/sell', {
      method: 'POST',
      body: { cryptocurrency_id: cryptocurrencyId, amount_usd: amountUsd, quantity },
    });
  }

  // Transaction endpoints
  async getTransactions(page = 1, type = 'ALL') {
    return request('/transactions', { params: { page, type } });
  }

  // News endpoints
  async getCryptoNews(limit = 20) {
    return request('/news/crypto', { params: { limit } });
  }

  // Market endpoints
  async getCryptoPriceHistory(symbol, timeframe = '1Y', { signal } = {}) {
    const data = await request('/market/crypto/history', {
      params: { symbol, timeframe },
      signal,
    });
    // Backend may return 204→null for no data; normalize to []
    return Array.isArray(data) ? data : [];
  }

  // Price History endpoint (new - uses /price_history)
  async getPriceHistory(symbol, period = '1y', { signal } = {}) {
    const data = await request('/price_history', {
      params: { symbol, period },
      signal,
    });

    // Normalize to expected structure
    return data || { count: 0, data: [] };
  }

  // User endpoints
  async getUserAccount() {
    return request('/user/account');
  }
}

export default new ApiService();
