import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import websocketService from '../services/websocket';

const PortfolioContext = createContext();

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
