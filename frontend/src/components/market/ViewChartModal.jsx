/**
 * View Chart Modal Component - Historical Price Chart for Individual Cryptocurrency
 *
 * Modal dialog displaying historical price data for selected cryptocurrency with timeframe
 * selection, line chart visualization, and custom tooltip. Fetches data from yfinance via
 * backend proxy and supports request cancellation for rapid timeframe changes.
 *
 * **Features:**
 * - Timeframe Selection: 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, ALL (max supported)
 * - Line Chart: Purple line (#5B4FDB) with price on Y-axis, date on X-axis
 * - Custom Tooltip: Date/time + formatted price on hover
 * - Request Cancellation: AbortController for rapid timeframe changes
 * - Loading/Error/Empty States: Skeleton, Alert with retry, info message
 * - Crypto Header: Avatar icon, name, symbol in dialog title
 *
 * **Timeframe Mapping:**
 * - Frontend buttons: '1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'
 * - Backend periods: '1d', '5d', '1mo', '3mo', '6mo', 'ytd', '1y', '5y', 'max'
 * - Conversion: TIMEFRAME_TO_PERIOD_MAP object
 * - Default: '1Y' (frontend) → '1y' (backend)
 *
 * **Symbol Mapping:**
 * - App symbols: 'BTC', 'ETH', 'SOL', 'USDC', 'XRP'
 * - yfinance tickers: 'BTC-USD', 'ETH-USD', 'SOL-USD', 'USDC-USD', 'XRP-USD'
 * - SYMBOL_MAP: Hardcoded mapping for common symbols
 * - Fallback: `${appSymbol.toUpperCase()}-USD` for unknown symbols
 *
 * **Data Fetching:**
 * - Backend Endpoint: GET /api/trading/price_history?symbol={symbol}&period={period}&interval=1d
 * - yfinance Integration: Backend uses yfinance.Ticker(symbol).history(period=period, interval=interval)
 * - Response Structure: { symbol, period, interval, count, data: [{date, close, volume, datetime?}] }
 * - Empty data: Backend returns error field or empty data array
 *
 * **Request Cancellation:**
 * - AbortController: Created on each fetch, stored in abortControllerRef
 * - Cancel previous: Aborts previous request if timeframe changes rapidly
 * - Cleanup: Aborts on modal close or component unmount
 * - Error handling: Ignores 'AbortError' and 'CanceledError' (Axios)
 *
 * **Chart Data Transformation:**
 * - Backend format: { date, close, volume, datetime? }
 * - Chart format: { date, timestamp, price }
 * - date: YYYY-MM-DD string for X-axis and daily timeframes
 * - timestamp: YYYY-MM-DD HH:MM string for intraday (1D, 5D) - optional
 * - price: parseFloat(close) for Y-axis
 *
 * **X-Axis Date Formatting:**
 * - Intraday (1D, 5D): Uses timestamp if available → "MMM d, h:mm a" (e.g., "Jan 15, 2:30 PM")
 * - Short-term (1M, 3M): "MMM d" (e.g., "Jan 15")
 * - Long-term (6M, YTD, 1Y, 5Y, ALL): "MMM yyyy" (e.g., "Jan 2025")
 * - date-fns: parse() with 'yyyy-MM-dd' format, format() for display
 * - Angle: -45 degrees for readability, textAnchor: 'end'
 *
 * **Custom Tooltip:**
 * - Active on hover over chart line
 * - Shows: Date/time + formatted price
 * - Date: Uses timestamp for intraday, date for longer periods
 * - Price: formatCurrency(value) → "$1,234.56"
 * - Styling: White background, border, shadow, padding
 *
 * **Loading State:**
 * - Skeleton: Rectangular placeholder (width: 100%, height: 400px)
 * - Displayed: During initial fetch or timeframe change
 * - Timeframe buttons disabled during loading
 *
 * **Error State:**
 * - Alert severity="error" with error message
 * - Retry button: Calls fetchChartData() to re-attempt fetch
 * - Error message: From backend (err.message) or fallback "Failed to load chart data"
 * - Empty data: Shows Alert severity="info" with "No price data available for this timeframe"
 *
 * **Empty State:**
 * - Displayed when response.data is empty array
 * - Alert severity="info" message: "No price data available for this timeframe"
 * - Can occur for: Very new coins, stablecoins with flat prices, yfinance data gaps
 *
 * **Modal Props:**
 * - open: Boolean controlling modal visibility
 * - onClose: Function to close modal (passed to Dialog and Close button)
 * - crypto: Cryptocurrency object { id, name, symbol, icon_url, current_price, ... }
 *
 * **Chart Styling:**
 * - Line color: #5B4FDB (primary purple theme)
 * - Line width: 2px
 * - Dot: false (no dots on line)
 * - Active dot: 6px radius on hover
 * - Grid: 3-3 dash pattern, light gray (#E0E0E0)
 * - Y-axis: Auto domain, formatted as currency
 *
 * **Performance Considerations:**
 * - AbortController prevents race conditions on rapid timeframe changes
 * - chart data typically small (<500 points per timeframe)
 * - Recharts uses efficient rendering with SVG
 * - No auto-refresh (user must manually change timeframe or reopen modal)
 *
 * **Responsive Design:**
 * - Dialog maxWidth="lg" (1280px)
 * - ResponsiveContainer: 100% width, 400px height
 * - Timeframe toggle: Wraps on small screens (flexWrap: 'wrap')
 * - X-axis height: 80px to accommodate angled labels
 *
 * **Backend Integration:**
 * - Endpoint: GET /api/trading/price_history
 * - Implementation: trading/api.py:get_price_history_yfinance()
 * - yfinance: Python library for Yahoo Finance historical data
 * - See backend docstrings for period/interval mapping logic
 *
 * **Related Components:**
 * - CryptocurrencyList.jsx: Triggers modal on "View Chart" button click
 * - Market.js: Parent page containing CryptocurrencyList
 * - apiService.getPriceHistory(): Axios method for fetching data
 *
 * **Edge Cases:**
 * - Symbol not in SYMBOL_MAP: Falls back to `${symbol}-USD`
 * - No data from yfinance: Shows empty state with info message
 * - Request aborted: Silently ignored (no error displayed)
 * - Modal closed during fetch: Request aborted in cleanup
 * - Timeframe changed during fetch: Previous request aborted, new request starts
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Modal visibility state
 * @param {Function} props.onClose - Callback to close modal
 * @param {Object} props.crypto - Cryptocurrency object with name, symbol, icon_url, etc.
 * @example
 * const [chartOpen, setChartOpen] = useState(false);
 * const [selectedCrypto, setSelectedCrypto] = useState(null);
 *
 * <Button onClick={() => { setSelectedCrypto(crypto); setChartOpen(true); }}>
 *   View Chart
 * </Button>
 * <ViewChartModal
 *   open={chartOpen}
 *   onClose={() => setChartOpen(false)}
 *   crypto={selectedCrypto}
 * />
 */
import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { format, parse } from 'date-fns';
import apiService from '../../services/apiAxios';

// Symbol mapping: App symbols → yfinance tickers
const SYMBOL_MAP = {
  'BTC': 'BTC-USD',
  'ETH': 'ETH-USD',
  'SOL': 'SOL-USD',
  'USDC': 'USDC-USD',
  'XRP': 'XRP-USD',
};

// Helper: Map app symbol to yfinance ticker
const getYFinanceSymbol = (appSymbol) => {
  return SYMBOL_MAP[appSymbol.toUpperCase()] || `${appSymbol.toUpperCase()}-USD`;
};

// Timeframe mapping: Frontend buttons → Backend period parameter
const TIMEFRAME_TO_PERIOD_MAP = {
  '1D': '1d',
  '5D': '5d',
  '1M': '1mo',
  '3M': '3mo',
  '6M': '6mo',
  'YTD': 'ytd',
  '1Y': '1y',
  '5Y': '5y',
  'ALL': 'max',
};

// Helper: Convert frontend timeframe to backend period
const getPeriodFromTimeframe = (timeframe) => {
  return TIMEFRAME_TO_PERIOD_MAP[timeframe] || '1y';
};

const ViewChartModal = ({ open, onClose, crypto }) => {
  const [timeframe, setTimeframe] = useState('1Y');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Timeframe options
  const timeframes = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

  // Fetch data when modal opens or timeframe changes
  useEffect(() => {
    if (open && crypto) {
      fetchChartData();
    }
  }, [open, crypto, timeframe]);

  const fetchChartData = async () => {
    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller for this request
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Map frontend values to backend format
      const yfinanceSymbol = getYFinanceSymbol(crypto.symbol);
      const period = getPeriodFromTimeframe(timeframe);

      // Call production endpoint (using /price_history)
      const response = await apiService.getPriceHistory(
        yfinanceSymbol,
        period,
        { signal: abortControllerRef.current.signal }
      );

      // Check for empty data
      if (!response.data || response.data.length === 0) {
        setChartData([]);
        setError(response.error || 'No price data available for this timeframe');
        return;
      }

      // Transform backend response to chart format
      // Backend: { date, close, volume, datetime? }
      // Chart needs: { date, price, timestamp? }
      const normalizedData = response.data.map((point) => ({
        date: point.date,
        timestamp: point.datetime || null, // Backend uses 'datetime' for intraday
        price: parseFloat(point.close), // Backend uses 'close'
      }));

      setChartData(normalizedData);
    } catch (err) {
      // Ignore abort/cancel errors (from rapid timeframe changes)
      // Axios uses 'CanceledError' or the error could be from AbortController ('AbortError')
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        // Axios interceptor already extracts backend error messages
        setError(err.message || 'Failed to load chart data');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Reset timeframe when modal opens
  useEffect(() => {
    if (open) {
      setTimeframe('1Y');
      setError(null);
    }
  }, [open]);

  // Cleanup: abort any pending request when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      // Use timestamp for intraday (1D, 5D), otherwise use date
      const displayDate = dataPoint.timestamp || dataPoint.date;

      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {displayDate}
          </Typography>
          <Typography variant="body2" fontWeight={600} color="primary">
            {formatCurrency(payload[0].value)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Format date for X-axis based on timeframe
  const formatXAxisDate = (dateStr, index) => {
    try {
      // For intraday (1D, 5D), use timestamp if available
      if ((timeframe === '1D' || timeframe === '5D') && chartData[index]?.timestamp) {
        // Backend returns 'YYYY-MM-DD HH:MM' format (no seconds)
        const timestamp = parse(chartData[index].timestamp, 'yyyy-MM-dd HH:mm', new Date());
        return format(timestamp, 'MMM d, h:mm a');
      }

      // For longer timeframes, use date
      const date = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (timeframe === '1M' || timeframe === '3M') {
        return format(date, 'MMM d');
      } else {
        return format(date, 'MMM yyyy');
      }
    } catch (err) {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          {crypto && (
            <>
              <Avatar src={crypto.icon_url} alt={crypto.symbol} sx={{ width: 48, height: 48 }} />
              <Box>
                <Typography variant="h6">
                  {crypto.name} ({crypto.symbol})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  View Historical Performance
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Timeframe Toggle */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={(e, newTimeframe) => newTimeframe && setTimeframe(newTimeframe)}
            size="small"
            disabled={loading}
            sx={{
              flexWrap: 'wrap',
            }}
          >
            {timeframes.map((tf) => (
              <ToggleButton
                key={tf}
                value={tf}
                sx={{
                  px: 2,
                  py: 0.5,
                }}
              >
                {tf}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Chart Area */}
        <Box sx={{ height: 400, width: '100%', mt: 2 }}>
          {loading ? (
            <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 2 }} />
          ) : error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={fetchChartData}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          ) : chartData.length === 0 ? (
            <Alert severity="info">No price data available for this timeframe</Alert>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatXAxisDate}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  width={80}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#5B4FDB"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewChartModal;
