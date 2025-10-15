// API service for communicating with Django backend

const API_BASE_URL = '/api/trading';

class ApiService {
  // Portfolio endpoints
  async getPortfolioSummary() {
    const response = await fetch(`${API_BASE_URL}/portfolio/summary`);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio summary');
    }
    return response.json();
  }

  async getPortfolioHistory(timeframe = '1M') {
    const response = await fetch(`${API_BASE_URL}/portfolio/history?timeframe=${timeframe}`);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio history');
    }
    return response.json();
  }

  // Holdings endpoints
  async getHoldings() {
    const response = await fetch(`${API_BASE_URL}/holdings`);
    if (!response.ok) {
      throw new Error('Failed to fetch holdings');
    }
    return response.json();
  }

  // Cryptocurrency endpoints
  async getCryptocurrencies() {
    const response = await fetch(`${API_BASE_URL}/cryptocurrencies`);
    if (!response.ok) {
      throw new Error('Failed to fetch cryptocurrencies');
    }
    return response.json();
  }

  async getCryptocurrencyDetail(cryptoId) {
    const response = await fetch(`${API_BASE_URL}/cryptocurrencies/${cryptoId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch cryptocurrency detail');
    }
    return response.json();
  }

  // Trading endpoints
  async executeBuy(cryptocurrencyId, amountUsd = null, quantity = null) {
    const response = await fetch(`${API_BASE_URL}/trades/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cryptocurrency_id: cryptocurrencyId,
        amount_usd: amountUsd,
        quantity: quantity,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to execute buy order');
    }
    return response.json();
  }

  async executeSell(cryptocurrencyId, amountUsd = null, quantity = null) {
    const response = await fetch(`${API_BASE_URL}/trades/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cryptocurrency_id: cryptocurrencyId,
        amount_usd: amountUsd,
        quantity: quantity,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to execute sell order');
    }
    return response.json();
  }

  // Transaction endpoints
  async getTransactions(page = 1, type = 'ALL') {
    const response = await fetch(`${API_BASE_URL}/transactions?page=${page}&type=${type}`);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  }
}

export default new ApiService();
