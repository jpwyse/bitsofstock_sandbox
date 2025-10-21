/**
 * Cryptocurrency List Component - Market Table with Filtering and Sorting
 *
 * Main market table displaying all available cryptocurrencies with filtering by category,
 * sorting by volume/movers, and quick access to trading and chart modals. Fetches data once
 * on mount and applies client-side filtering/sorting.
 *
 * **Features:**
 * - Category Filtering: Filter by CRYPTO, STABLECOIN, DEFI, NFT, MEME (or null for ALL)
 * - Sorting: Sort by volume_24h (Top Traded) or price_change_24h (Top Movers)
 * - Trade Modal: Opens TradeModal for buy/sell operations
 * - View Chart Modal: Opens ViewChartModal for historical price charts
 * - Loading/Empty States: CircularProgress spinner and empty state message
 *
 * **Props:**
 * - category (string|null): Category filter (e.g., "CRYPTO", "STABLECOIN") or null for ALL
 *   • Used by Market.js tabs: All (null), Crypto ("CRYPTO"), Stablecoins ("STABLECOIN")
 *   • Backend categorization: trading/models.py:Cryptocurrency.CATEGORY_CHOICES
 *
 * - sortBy (string|null): Sort mode ("volume" or "movers") or null for no sorting
 *   • "volume": Sort by volume_24h descending (highest volume first) - Top Traded tab
 *   • "movers": Sort by absolute price_change_24h descending (biggest movers first) - Top Movers tab
 *   • null: No sorting (default database order) - All/Crypto/Stablecoins tabs
 *
 * **Data Fetching:**
 * - Backend Endpoint: GET /api/trading/cryptocurrencies
 * - Fetches all cryptocurrencies once on mount (useEffect with empty deps)
 * - No pagination (limited dataset, typically < 100 cryptos)
 * - Caching: None at component level (could cache in future)
 *
 * **Filtering Logic:**
 * - category=null: Shows all cryptocurrencies (no filter)
 * - category="CRYPTO": Shows only crypto.category === "CRYPTO"
 * - category="STABLECOIN": Shows only crypto.category === "STABLECOIN"
 * - Applied via Array.filter() on allCryptocurrencies
 *
 * **Sorting Logic:**
 * - sortBy="volume": cryptocurrencies.sort((a, b) => parseFloat(b.volume_24h) - parseFloat(a.volume_24h))
 * - sortBy="movers": cryptocurrencies.sort((a, b) => Math.abs(parseFloat(b.price_change_24h)) - Math.abs(parseFloat(a.price_change_24h)))
 * - Creates copy with [...filteredCryptos] to avoid mutating original array
 *
 * **Table Columns:**
 * 1. Asset: Icon (40x40 Avatar) + Symbol (bold) + Name (caption)
 * 2. Price: current_price (h6, bold, formatted currency)
 * 3. 24h Change: price_change_24h with TrendingUp/Down icon and color (green/red)
 * 4. 24h Volume: volume_24h (formatted large number - K/M/B/T)
 * 5. Market Cap: market_cap (formatted large number)
 * 6. Actions: "View" button (green, opens ViewChartModal) + "Trade" button (primary, opens TradeModal)
 *
 * **Trade Modal Integration:**
 * - Opens TradeModal with selected cryptocurrency
 * - tradeType="buy" (default, user can toggle to sell within modal)
 * - OnClose: Clears selectedCrypto and closes modal
 *
 * **View Chart Modal Integration:**
 * - Opens ViewChartModal with selected cryptocurrency
 * - Displays historical price chart with timeframe selection
 * - OnClose: Clears viewSelectedCrypto and closes modal
 *
 * **Loading State:**
 * - CircularProgress centered in Box (minHeight: 400px)
 * - Displayed during initial API fetch
 *
 * **Empty State:**
 * - Displays when no cryptocurrencies match filters
 * - Message: "No cryptocurrencies available"
 * - Centered text layout with py: 6 spacing
 *
 * **Color Coding:**
 * - Price Change: Green (success.main) for positive, red (error.main) for negative
 * - Trending Icons: TrendingUpIcon (green) for gain, TrendingDownIcon (red) for loss
 *
 * **Performance Considerations:**
 * - Single API call on mount (no polling or auto-refresh)
 * - Client-side filtering/sorting (fast for < 100 items)
 * - Table virtualization not needed (small dataset)
 * - Modal state managed locally (selectedCrypto, viewSelectedCrypto)
 *
 * **Responsive Design:**
 * - TableContainer with Paper wrapper
 * - Horizontal scroll on small screens (MUI default behavior)
 * - Action buttons stacked in flexbox (gap: 1)
 *
 * **Backend Integration:**
 * - Endpoint: GET /api/trading/cryptocurrencies
 * - Implementation: trading/api.py:get_cryptocurrencies()
 * - Returns: CryptocurrencyListSchema array
 * - Fields: id, symbol, name, current_price, price_change_24h, volume_24h, market_cap, category, icon_url
 *
 * **Related Components:**
 * - Market.js: Parent page with tabs that pass category/sortBy props
 * - TradeModal.jsx: Modal for buy/sell operations
 * - ViewChartModal.jsx: Modal for historical price charts
 * - apiService.getCryptocurrencies(): Axios method for fetching data
 *
 * **Usage Pattern:**
 * ```javascript
 * // All cryptocurrencies (no filter, no sort)
 * <CryptocurrencyList category={null} sortBy={null} />
 *
 * // Only CRYPTO category
 * <CryptocurrencyList category="CRYPTO" sortBy={null} />
 *
 * // All cryptos sorted by volume
 * <CryptocurrencyList category={null} sortBy="volume" />
 *
 * // Only stablecoins
 * <CryptocurrencyList category="STABLECOIN" sortBy={null} />
 * ```
 *
 * @component
 * @param {Object} props - Component props
 * @param {string|null} props.category - Category filter ("CRYPTO", "STABLECOIN", etc.) or null for ALL
 * @param {string|null} props.sortBy - Sort mode ("volume", "movers") or null for no sorting
 * @example
 * // Rendered by Market.js tabs
 * {currentTab === 0 && <CryptocurrencyList category={null} sortBy={null} />}
 * {currentTab === 1 && <CryptocurrencyList category="CRYPTO" sortBy={null} />}
 * {currentTab === 3 && <CryptocurrencyList category={null} sortBy="volume" />}
 */
import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Avatar,
  Button,
  CircularProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatCurrency, formatPercentage, formatLargeNumber } from '../../utils/formatters';
import TradeModal from '../TradeModal';
import ViewChartModal from './ViewChartModal';
import apiService from '../../services/apiAxios';

const CryptocurrencyList = ({ category = null, sortBy = null }) => {
  const [allCryptocurrencies, setAllCryptocurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewSelectedCrypto, setViewSelectedCrypto] = useState(null);

  // Fetch all cryptocurrencies once on mount
  useEffect(() => {
    const fetchCryptocurrencies = async () => {
      setLoading(true);
      try {
        const data = await apiService.getCryptocurrencies();
        setAllCryptocurrencies(data);
      } catch (err) {
        console.error('Error fetching cryptocurrencies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCryptocurrencies();
  }, []); // Empty dependency array - fetch only once

  // Filter cryptocurrencies based on category prop
  const filteredCryptos = category
    ? allCryptocurrencies.filter(crypto => crypto.category === category)
    : allCryptocurrencies;

  // Sort based on sortBy prop
  let cryptocurrencies = [...filteredCryptos]; // Create copy to avoid mutating

  if (sortBy === 'volume') {
    // Sort by volume_24h (descending - highest first)
    cryptocurrencies.sort((a, b) => {
      const volumeA = parseFloat(a.volume_24h || 0);
      const volumeB = parseFloat(b.volume_24h || 0);
      return volumeB - volumeA;
    });
  } else if (sortBy === 'movers') {
    // Sort by absolute value of price_change_24h (descending - biggest movers first)
    cryptocurrencies.sort((a, b) => {
      const changeA = Math.abs(parseFloat(a.price_change_24h || 0));
      const changeB = Math.abs(parseFloat(b.price_change_24h || 0));
      return changeB - changeA;
    });
  }

  const handleOpenTrade = (crypto) => {
    setSelectedCrypto(crypto);
    setTradeModalOpen(true);
  };

  const handleCloseTrade = () => {
    setTradeModalOpen(false);
    setSelectedCrypto(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!cryptocurrencies || cryptocurrencies.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary">
          No cryptocurrencies available
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">24h Change</TableCell>
              <TableCell align="right">24h Volume</TableCell>
              <TableCell align="right">Market Cap</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cryptocurrencies.map((crypto) => (
              <TableRow key={crypto.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      src={crypto.icon_url}
                      alt={crypto.symbol}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {crypto.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {crypto.name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6" fontWeight={600}>
                    {formatCurrency(crypto.current_price)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                    {crypto.price_change_24h >= 0 ? (
                      <TrendingUpIcon color="success" fontSize="small" />
                    ) : (
                      <TrendingDownIcon color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={crypto.price_change_24h >= 0 ? 'success.main' : 'error.main'}
                    >
                      {formatPercentage(crypto.price_change_24h)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatLargeNumber(crypto.volume_24h)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={500}>
                    {formatLargeNumber(crypto.market_cap)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        setViewSelectedCrypto(crypto);
                        setViewModalOpen(true);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleOpenTrade(crypto)}
                    >
                      Trade
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TradeModal
        open={tradeModalOpen}
        onClose={handleCloseTrade}
        cryptocurrency={selectedCrypto}
        tradeType="buy"
      />

      <ViewChartModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewSelectedCrypto(null);
        }}
        crypto={viewSelectedCrypto}
      />
    </>
  );
};

export default CryptocurrencyList;
