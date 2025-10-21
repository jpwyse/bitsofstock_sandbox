/**
 * Mock implementation of API service for testing.
 *
 * Provides mock implementations of all API endpoints used by the frontend.
 * Tests can override specific methods using jest.spyOn().
 *
 * Usage in tests:
 *   import api from '../services/api';
 *   jest.mock('../services/api');
 *
 *   api.portfolioAPI.getSummary.mockResolvedValue({ ... });
 */

// Mock portfolio data
export const mockPortfolioSummary = {
  cash_balance: '10000.00',
  total_holdings_value: '15000.00',
  total_portfolio_value: '25000.00',
  initial_investment: '20000.00',
  total_gain_loss: '5000.00',
  total_gain_loss_percentage: '25.00',
  last_updated: '2025-01-15T12:00:00Z',
};

export const mockHoldings = [
  {
    id: '1',
    cryptocurrency: {
      id: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      icon_url: 'https://example.com/btc.png',
      current_price: '50000.00',
    },
    quantity: '0.5',
    average_purchase_price: '48000.00',
    total_cost_basis: '24000.00',
    current_value: '25000.00',
    gain_loss: '1000.00',
    gain_loss_percentage: '4.17',
  },
];

export const mockCryptocurrencies = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    coingecko_id: 'bitcoin',
    icon_url: 'https://example.com/btc.png',
    category: 'CRYPTO',
    current_price: '50000.00',
    price_change_24h: '2.5',
    volume_24h: '1000000000.00',
    market_cap: '1000000000000.00',
    last_updated: '2025-01-15T12:00:00Z',
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    coingecko_id: 'ethereum',
    icon_url: 'https://example.com/eth.png',
    category: 'CRYPTO',
    current_price: '3000.00',
    price_change_24h: '-1.2',
    volume_24h: '500000000.00',
    market_cap: '500000000000.00',
    last_updated: '2025-01-15T12:00:00Z',
  },
];

export const mockNewsArticles = [
  {
    id: 1,
    headline: 'Bitcoin Reaches New High',
    summary: 'Bitcoin price surges past $50k',
    source: 'CryptoNews',
    url: 'https://example.com/news/1',
    image: 'https://example.com/img/1.jpg',
    datetime: 1705305600,
  },
];

// Mock API object
const api = {
  portfolioAPI: {
    getSummary: jest.fn().mockResolvedValue({ data: mockPortfolioSummary }),
    getHistory: jest.fn().mockResolvedValue({
      data: {
        timeframe: '1M',
        data_points: [
          { timestamp: '2025-01-01T00:00:00Z', portfolio_value: '20000.00' },
          { timestamp: '2025-01-15T00:00:00Z', portfolio_value: '25000.00' },
        ],
      },
    }),
  },

  holdingsAPI: {
    getAll: jest.fn().mockResolvedValue({ data: { holdings: mockHoldings } }),
  },

  cryptoAPI: {
    getAll: jest.fn().mockResolvedValue({ data: mockCryptocurrencies }),
    getDetail: jest.fn().mockResolvedValue({
      data: {
        ...mockCryptocurrencies[0],
        price_history_7d: [
          { date: '2025-01-10', price: '48000.00' },
          { date: '2025-01-15', price: '50000.00' },
        ],
      },
    }),
  },

  tradingAPI: {
    buy: jest.fn().mockResolvedValue({
      data: {
        success: true,
        transaction: {
          id: 'txn1',
          type: 'BUY',
          cryptocurrency: { symbol: 'BTC', name: 'Bitcoin' },
          quantity: '0.1',
          price_per_unit: '50000.00',
          total_amount: '5000.00',
          timestamp: '2025-01-15T12:00:00Z',
          realized_gain_loss: '0.00',
        },
        updated_portfolio: {
          cash_balance: '5000.00',
          total_portfolio_value: '30000.00',
        },
      },
    }),
    sell: jest.fn().mockResolvedValue({
      data: {
        success: true,
        transaction: {
          id: 'txn2',
          type: 'SELL',
          cryptocurrency: { symbol: 'BTC', name: 'Bitcoin' },
          quantity: '0.1',
          price_per_unit: '50000.00',
          total_amount: '5000.00',
          timestamp: '2025-01-15T12:00:00Z',
          realized_gain_loss: '200.00',
        },
        updated_portfolio: {
          cash_balance: '15000.00',
          total_portfolio_value: '20000.00',
        },
      },
    }),
  },

  transactionsAPI: {
    getAll: jest.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'txn1',
            type: 'BUY',
            cryptocurrency: { symbol: 'BTC', name: 'Bitcoin' },
            quantity: '0.1',
            price_per_unit: '50000.00',
            total_amount: '5000.00',
            timestamp: '2025-01-15T12:00:00Z',
            realized_gain_loss: '0.00',
          },
        ],
        count: 1,
      },
    }),
  },

  newsAPI: {
    getCrypto: jest.fn().mockResolvedValue({ data: mockNewsArticles }),
  },

  marketAPI: {
    getCryptoHistory: jest.fn().mockResolvedValue({
      data: [
        { date: '2025-01-01', price: '48000.00' },
        { date: '2025-01-15', price: '50000.00' },
      ],
    }),
  },
};

export default api;
