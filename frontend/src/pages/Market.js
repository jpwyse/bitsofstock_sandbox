/**
 * Market Page - Cryptocurrency Browsing and Trading
 *
 * Market discovery page displaying available cryptocurrencies with filtering, sorting,
 * and quick access to trade modals. Provides tabbed interface for different market views
 * (All, Crypto, Stablecoins, Top Traded, Top Movers).
 *
 * Features:
 * - Tabbed Views:
 *   1. All: All active cryptocurrencies (category=null, sortBy=null)
 *   2. Crypto: Filtered to category="CRYPTO"
 *   3. Stablecoins: Filtered to category="STABLECOIN"
 *   4. Top Traded: Sorted by 24h volume descending (sortBy="volume")
 *   5. Top Movers: Sorted by 24h price change descending (sortBy="movers")
 *
 * Data Sources:
 * - CryptocurrencyList component fetches: /api/cryptocurrencies
 *   • Returns all active cryptocurrencies with current prices
 *   • Prices updated by backend background worker (update_prices.py)
 *   • WebSocket real-time price updates not implemented (uses polling)
 *
 * State Management:
 * - currentTab: Active tab index (0-4) for view selection
 * - Tab change triggers re-render of CryptocurrencyList with new category/sortBy props
 *
 * Child Component:
 * - CryptocurrencyList: Displays cryptocurrency table with:
 *   • Symbol, name, icon, current price, 24h change, volume, market cap
 *   • Buy button for quick trade access (opens TradeModal)
 *   • Chart icon for price history (opens ViewChartModal)
 *   • Client-side sorting and filtering based on props
 *
 * Layout:
 * - Full width container (maxWidth="xl")
 * - No max-width restriction (unlike Portfolio.js 90% or News.js 80%)
 * - Padding: py: 4, pb: 6 (top/bottom padding)
 *
 * Navigation:
 * - Accessed via main app navigation (/market route)
 * - Entry point for asset discovery and trading
 *
 * Trade Flow:
 * - User clicks "Buy" button on cryptocurrency row
 * - CryptocurrencyList opens TradeModal with selected cryptocurrency
 * - TradeModal submits to /api/trades/buy
 * - PortfolioContext refreshes on successful trade
 *
 * Performance Considerations:
 * - Tab content not lazy-rendered (CryptocurrencyList always mounted)
 * - Props change triggers re-filter/re-sort in child component
 * - All cryptocurrencies loaded once (no pagination)
 * - Typical dataset: 5-20 cryptocurrencies (small, no performance concerns)
 *
 * Category Types:
 * - CRYPTO: Standard cryptocurrencies (BTC, ETH, SOL, etc.)
 * - STABLECOIN: Pegged to fiat currencies (USDC, USDT, etc.)
 * - DEFI, NFT, MEME: Additional categories (if added to backend)
 *
 * Sorting Logic (in CryptocurrencyList):
 * - volume: Sort by volume_24h descending
 * - movers: Sort by absolute value of price_change_24h descending
 * - null: Default order (as returned by API)
 *
 * Related Components:
 * - CryptocurrencyList: Main list/table component
 * - TradeModal: Buy/sell modal (opened from list)
 * - ViewChartModal: Price history chart (opened from list)
 *
 * @component
 * @example
 * // Rendered by React Router at /market route
 * <Route path="/market" element={<Market />} />
 */
import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import CryptocurrencyList from '../components/market/CryptocurrencyList';

const Market = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, pb: 6 }}>
      {/* Market Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom fontWeight={700}>
          Market
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse and trade available cryptocurrencies.
        </Typography>
      </Box>

      {/* Tabs for Market Views */}
      <Box>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="All" />
          <Tab label="Crypto" />
          <Tab label="Stablecoins" />
          <Tab label="Top Traded" />
          <Tab label="Top Movers" />
        </Tabs>

        {currentTab === 0 && <CryptocurrencyList category={null} sortBy={null} />}
        {currentTab === 1 && <CryptocurrencyList category="CRYPTO" sortBy={null} />}
        {currentTab === 2 && <CryptocurrencyList category="STABLECOIN" sortBy={null} />}
        {currentTab === 3 && <CryptocurrencyList category={null} sortBy="volume" />}
        {currentTab === 4 && <CryptocurrencyList category={null} sortBy="movers" />}
      </Box>
    </Container>
  );
};

export default Market;
