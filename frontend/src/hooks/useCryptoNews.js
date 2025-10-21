import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

const CACHE_KEY = 'crypto_news_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Custom hook for fetching and managing crypto news data with 24-hour caching
 *
 * @param {number} limit - Number of articles to fetch (default 20)
 * @returns {Object} - { articles, loading, error, refetch }
 */
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
