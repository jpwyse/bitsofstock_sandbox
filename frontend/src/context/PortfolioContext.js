/**
 * Portfolio Context - Global State Management for Portfolio Data
 *
 * React Context provider for managing global portfolio state, including portfolio summary,
 * holdings, cryptocurrencies, transactions, and trade execution. Provides centralized data
 * fetching, WebSocket price updates, and trade operations (buy/sell) to all components.
 *
 * **Architecture:**
 * - Context API: Single source of truth for portfolio data
 * - API Service: Axios-based HTTP client for Django backend
 * - WebSocket Service: Real-time price updates via Django Channels
 * - State: portfolio, holdings, cryptocurrencies, transactions, loading, error
 * - Methods: executeBuy, executeSell, refresh* functions
 *
 * **Global State:**
 * - portfolio: Portfolio summary (total_value, gain_loss, gain_loss_percentage, cash_balance)
 *   • Updated by: fetchPortfolio() on mount, after trades, on WebSocket price updates
 *   • Source: GET /api/trading/portfolio/summary
 *
 * - holdings: Array of user's crypto holdings (cryptocurrency, quantity, cost_basis, current_value, gain_loss)
 *   • Updated by: fetchHoldings() on mount, after trades, on WebSocket price updates
 *   • Source: GET /api/trading/holdings
 *
 * - cryptocurrencies: Array of all available cryptocurrencies (id, name, symbol, current_price, price_change_24h)
 *   • Updated by: fetchCryptocurrencies() on mount, handlePriceUpdate() on WebSocket messages
 *   • Source: GET /api/trading/cryptocurrencies (initial), WebSocket (real-time updates)
 *
 * - transactions: Array of recent transactions (type, cryptocurrency, quantity, price, total_amount, timestamp)
 *   • Updated by: fetchTransactions() on mount, after trades
 *   • Source: GET /api/trading/transactions
 *
 * - loading: Boolean indicating initial data load (true until all parallel fetches complete)
 *   • Set to true on mount, false after Promise.all([fetchPortfolio, fetchHoldings, fetchCryptocurrencies, fetchTransactions])
 *
 * - error: Error message string from failed API requests
 *   • Set by: fetch* methods on catch, cleared on successful fetch
 *   • Displayed by: Components with error states (Portfolio, Market, etc.)
 *
 * **Trade Execution:**
 * - executeBuy(cryptocurrencyId, amountUsd?, quantity?):
 *   • Calls apiService.executeBuy() → POST /api/trading/trades/buy
 *   • On success: Refreshes portfolio, holdings, transactions in parallel
 *   • Returns: { success, message, transaction, updated_portfolio }
 *   • Throws: Error on validation failure (insufficient cash, invalid amount, etc.)
 *
 * - executeSell(cryptocurrencyId, amountUsd?, quantity?):
 *   • Calls apiService.executeSell() → POST /api/trading/trades/sell
 *   • On success: Refreshes portfolio, holdings, transactions in parallel
 *   • Returns: { success, message, transaction, updated_portfolio, realized_gain_loss }
 *   • Throws: Error on validation failure (insufficient holdings, invalid quantity, etc.)
 *
 * **WebSocket Integration:**
 * - Connects on mount via websocketService.connect()
 * - Listens for 'price_update' messages (type: 'price_update', cryptocurrencies: [...])
 * - handlePriceUpdate():
 *   • Updates cryptocurrencies state with new current_price, price_change_24h, last_updated
 *   • Refreshes portfolio and holdings to reflect new prices
 *   • Triggered every 30 seconds by backend (PRICE_UPDATE_INTERVAL_SECONDS in Django)
 * - Disconnects on unmount via cleanup function
 *
 * **Initial Data Load:**
 * - useEffect on mount triggers loadInitialData()
 * - Parallel fetches: Promise.all([fetchPortfolio, fetchHoldings, fetchCryptocurrencies, fetchTransactions])
 * - Sets loading=false after all complete (success or failure)
 * - Components using context should check loading before rendering data
 *
 * **Refresh Methods:**
 * - refreshPortfolio(): Manual refresh of portfolio summary
 * - refreshHoldings(): Manual refresh of holdings
 * - refreshCryptocurrencies(): Manual refresh of cryptocurrency prices
 * - refreshTransactions(page, type): Manual refresh of transactions with pagination
 * - Use cases: User-triggered refresh, after external state changes, error retry
 *
 * **Usage Pattern:**
 * ```javascript
 * import { usePortfolio } from '../context/PortfolioContext';
 *
 * function MyComponent() {
 *   const {
 *     portfolio,
 *     holdings,
 *     cryptocurrencies,
 *     loading,
 *     error,
 *     executeBuy,
 *     executeSell,
 *     refreshPortfolio,
 *   } = usePortfolio();
 *
 *   if (loading) return <Skeleton />;
 *   if (error) return <Alert severity="error">{error}</Alert>;
 *
 *   const handleBuy = async () => {
 *     try {
 *       const result = await executeBuy(cryptoId, 100.0, null); // Buy $100 worth
 *       console.log('Trade success:', result.message);
 *     } catch (error) {
 *       console.error('Trade failed:', error.message);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <p>Portfolio Value: {formatCurrency(portfolio.total_value)}</p>
 *       <p>Holdings: {holdings.length}</p>
 *       <Button onClick={handleBuy}>Buy BTC</Button>
 *     </div>
 *   );
 * }
 * ```
 *
 * **Provider Setup:**
 * ```javascript
 * import { PortfolioProvider } from './context/PortfolioContext';
 *
 * function App() {
 *   return (
 *     <PortfolioProvider>
 *       <YourAppComponents />
 *     </PortfolioProvider>
 *   );
 * }
 * ```
 *
 * **Performance Considerations:**
 * - useCallback: All fetch and trade methods memoized to prevent re-renders
 * - WebSocket: Batched price updates every 30s (not per-price, all cryptos at once)
 * - Trade refresh: Parallel Promise.all([fetchPortfolio, fetchHoldings, fetchTransactions])
 * - No auto-polling: Data refreshed only on WebSocket updates, trades, or manual refresh
 *
 * **Error Handling:**
 * - Network errors: Caught by fetch* methods, stored in error state
 * - Trade errors: Re-thrown to calling component (TradeModal handles display)
 * - WebSocket errors: Handled by websocketService (auto-reconnect logic)
 * - Component access without provider: Throws error in usePortfolio hook
 *
 * **Related Files:**
 * - ../services/apiAxios.js: HTTP client for API requests
 * - ../services/websocket.js: WebSocket client for real-time price updates
 * - ../components/TradeModalAllCryptos.js: Uses executeBuy/executeSell
 * - ../pages/Portfolio.js: Uses portfolio, holdings, transactions
 * - ../pages/Market.js: Uses cryptocurrencies for market table
 *
 * **Backend Integration:**
 * - Django REST API: /api/trading/* endpoints
 * - Django Channels: WebSocket at ws://<host>/ws/prices/
 * - See trading/api.py for endpoint implementations
 * - See trading/consumers.py for WebSocket logic
 *
 * @module PortfolioContext
 * @requires react
 * @requires ../services/apiAxios
 * @requires ../services/websocket
 * @example
 * // Wrap app with PortfolioProvider
 * <PortfolioProvider>
 *   <App />
 * </PortfolioProvider>
 *
 * // Consume context in components
 * const { portfolio, executeBuy } = usePortfolio();
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiAxios';
import websocketService from '../services/websocket';

const PortfolioContext = createContext();

/**
 * Custom hook to access Portfolio context
 *
 * Provides access to global portfolio state and methods. Must be used within a
 * PortfolioProvider or will throw an error.
 *
 * @returns {Object} Portfolio context value
 * @returns {Object} return.portfolio - Portfolio summary (total_value, gain_loss, cash_balance)
 * @returns {Array} return.holdings - User's crypto holdings with P&L
 * @returns {Array} return.cryptocurrencies - All available cryptocurrencies with prices
 * @returns {Array} return.transactions - Recent transactions
 * @returns {boolean} return.loading - Initial data load indicator
 * @returns {string|null} return.error - Error message from failed requests
 * @returns {Function} return.executeBuy - Execute buy trade (cryptocurrencyId, amountUsd?, quantity?)
 * @returns {Function} return.executeSell - Execute sell trade (cryptocurrencyId, amountUsd?, quantity?)
 * @returns {Function} return.refreshPortfolio - Manually refresh portfolio summary
 * @returns {Function} return.refreshHoldings - Manually refresh holdings
 * @returns {Function} return.refreshCryptocurrencies - Manually refresh cryptocurrency prices
 * @returns {Function} return.refreshTransactions - Manually refresh transactions (page?, type?)
 * @throws {Error} If used outside of PortfolioProvider
 * @example
 * const { portfolio, executeBuy, loading } = usePortfolio();
 * if (loading) return <Spinner />;
 * return <div>{portfolio.total_value}</div>;
 */
export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [cryptocurrencies, setCryptocurrencies] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch portfolio summary
  const fetchPortfolio = useCallback(async () => {
    try {
      const data = await apiService.getPortfolioSummary();
      setPortfolio(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err.message);
    }
  }, []);

  // Fetch holdings
  const fetchHoldings = useCallback(async () => {
    try {
      const data = await apiService.getHoldings();
      setHoldings(data.holdings || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching holdings:', err);
      setError(err.message);
    }
  }, []);

  // Fetch cryptocurrencies
  const fetchCryptocurrencies = useCallback(async () => {
    try {
      const data = await apiService.getCryptocurrencies();
      setCryptocurrencies(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching cryptocurrencies:', err);
      setError(err.message);
    }
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async (page = 1, type = 'ALL') => {
    try {
      const data = await apiService.getTransactions(page, type);
      setTransactions(data.items || data);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    }
  }, []);

  // Execute buy trade
  const executeBuy = useCallback(async (cryptocurrencyId, amountUsd = null, quantity = null) => {
    try {
      const result = await apiService.executeBuy(cryptocurrencyId, amountUsd, quantity);
      if (result.success) {
        // Refresh portfolio and holdings after successful trade
        await Promise.all([fetchPortfolio(), fetchHoldings(), fetchTransactions()]);
      }
      return result;
    } catch (err) {
      console.error('Error executing buy:', err);
      throw err;
    }
  }, [fetchPortfolio, fetchHoldings, fetchTransactions]);

  // Execute sell trade
  const executeSell = useCallback(async (cryptocurrencyId, amountUsd = null, quantity = null) => {
    try {
      const result = await apiService.executeSell(cryptocurrencyId, amountUsd, quantity);
      if (result.success) {
        // Refresh portfolio and holdings after successful trade
        await Promise.all([fetchPortfolio(), fetchHoldings(), fetchTransactions()]);
      }
      return result;
    } catch (err) {
      console.error('Error executing sell:', err);
      throw err;
    }
  }, [fetchPortfolio, fetchHoldings, fetchTransactions]);

  // Handle WebSocket price updates
  const handlePriceUpdate = useCallback((data) => {
    if (data.type === 'price_update' && data.cryptocurrencies) {
      setCryptocurrencies(prevCryptos => {
        const updatedCryptos = [...prevCryptos];
        data.cryptocurrencies.forEach(updatedCrypto => {
          const index = updatedCryptos.findIndex(c => c.id === updatedCrypto.id);
          if (index !== -1) {
            updatedCryptos[index] = {
              ...updatedCryptos[index],
              current_price: updatedCrypto.current_price,
              price_change_24h: updatedCrypto.price_change_24h,
              last_updated: updatedCrypto.last_updated,
            };
          }
        });
        return updatedCryptos;
      });

      // Also refresh portfolio to update holdings values
      fetchPortfolio();
      fetchHoldings();
    }
  }, [fetchPortfolio, fetchHoldings]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPortfolio(),
          fetchHoldings(),
          fetchCryptocurrencies(),
          fetchTransactions(),
        ]);
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchPortfolio, fetchHoldings, fetchCryptocurrencies, fetchTransactions]);

  // Setup WebSocket connection
  useEffect(() => {
    websocketService.connect();
    websocketService.addListener(handlePriceUpdate);

    return () => {
      websocketService.removeListener(handlePriceUpdate);
      websocketService.disconnect();
    };
  }, [handlePriceUpdate]);

  const value = {
    portfolio,
    holdings,
    cryptocurrencies,
    transactions,
    loading,
    error,
    executeBuy,
    executeSell,
    refreshPortfolio: fetchPortfolio,
    refreshHoldings: fetchHoldings,
    refreshCryptocurrencies: fetchCryptocurrencies,
    refreshTransactions: fetchTransactions,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
