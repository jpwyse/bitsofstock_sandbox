/**
 * Portfolio Performance Chart Component - Portfolio Value Over Time
 *
 * Displays portfolio performance with area chart showing portfolio value over selected timeframe.
 * Features purple gradient fill, baseline reference line, summary statistic cards, and custom
 * tooltip with gain/loss calculations.
 *
 * **Features:**
 * - Timeframe Selection: 1D, 5D, 1M, 3M, 6M, YTD (max for portfolio-specific charts)
 * - Summary Cards: Initial Investment, Current Value, Total Gain/Loss, Total Return %
 * - Area Chart: Purple gradient fill with baseline reference line
 * - Custom Tooltip: Total Value, Gain/Loss ($), Gain/Loss (%) with color coding
 * - Loading/Error/Empty States: Skeleton, Alert, and empty state messages
 *
 * **Timeframe Limits:**
 * - Portfolio charts capped at YTD (Year-To-Date) - no 1Y, 5Y, ALL
 * - Reason: Portfolio inception date may not have long history
 * - Asset-specific charts (ViewChartModal) support longer ranges (1Y, 5Y, ALL)
 *
 * **Data Source:**
 * - Backend Endpoint: GET /api/trading/portfolio/history?timeframe={timeframe}
 * - Returns: { data_points: [{timestamp, portfolio_value}], timeframe }
 * - Pre-inception: Backend returns flat data at initial_investment
 * - Post-inception: Backend calculates mark-to-market (cash + holdings value)
 *
 * **Chart Data Transformation:**
 * - timestamp: Localized to viewer's timezone via new Date(point.timestamp)
 * - displayDate: Short date format for X-axis (e.g., "Jan 15")
 * - value: Portfolio value (parseFloat for Recharts)
 * - gainLoss: value - baseline (positive or negative)
 * - gainLossPercent: (gainLoss / baseline) * 100
 * - baseline: initial_investment (fallback 10000 if null)
 *
 * **Baseline Reference Line:**
 * - Horizontal dashed line at initial_investment
 * - Label: "~$10,000" (formatted currency)
 * - Purpose: Visual reference for break-even point
 * - Color: Gray (#666) with 5-5 dash pattern
 *
 * **Purple Gradient Fill:**
 * - Linear gradient: #5B4FDB (primary purple) → #7C3AED → #A78BFA (light purple)
 * - Matches project theme (purple/violet color scheme)
 * - Opacity: 0.85 (top) → 0.4 (middle) → 0.1 (bottom)
 * - Gradient ID: colorPortfolio (defined in <defs>)
 *
 * **Summary Cards (4 cards):**
 * 1. Initial Investment: portfolio.initial_investment (baseline)
 * 2. Current Value: portfolio.total_portfolio_value
 * 3. Total Gain/Loss: portfolio.total_gain_loss with +/- prefix and color (green/red)
 * 4. Total Return: portfolio.total_gain_loss_percentage% with +/- prefix and color
 *
 * **Custom Tooltip:**
 * - Shows on hover over chart area
 * - Timestamp: Localized date/time (e.g., "1/15/2025, 2:30:00 PM")
 * - Total Value: Formatted currency (e.g., "$10,234.56")
 * - Gain/Loss: Formatted currency with +/- prefix and color coding
 * - Gain/Loss %: Percentage with 2 decimal places and color coding
 * - Color coding: Green (success.main) for gain, red (error.main) for loss
 *
 * **Loading State:**
 * - CircularProgress spinner centered
 * - Message: "Loading performance data..."
 * - Triggered: On mount or timeframe change
 *
 * **Error State:**
 * - Alert component with severity="error"
 * - Message: "Failed to load performance data. Please try again."
 * - No auto-retry (user must change timeframe or reload page)
 *
 * **Empty State:**
 * - Displays when no data_points returned from backend
 * - Message: "No performance data available" + "Start trading to see your portfolio performance over time"
 * - Centered text layout
 *
 * **Performance Considerations:**
 * - Recharts uses virtualization for large datasets
 * - data_points typically small (<500 points per timeframe)
 * - isAnimationActive={true} for smooth chart transitions
 * - Re-fetches on timeframe change (useEffect dependency)
 *
 * **Responsive Design:**
 * - ResponsiveContainer: 100% width, 400px height
 * - Grid layout: 4 cards at md+ (3 columns each), stacked on mobile
 * - Timeframe toggle: Flexbox with flexGrow to push to far right
 *
 * **Backend Integration:**
 * - Endpoint: GET /api/trading/portfolio/history
 * - Implementation: trading/api.py:get_portfolio_history()
 * - Business logic: trading/services.py:get_portfolio_history_data()
 * - See backend docstrings for pre/post-inception logic
 *
 * **Related Components:**
 * - Portfolio.js: Parent page with tab containing this chart
 * - PortfolioAllocationChart.js: Sibling component (Allocation tab)
 * - usePortfolio hook: Provides portfolio summary data
 *
 * @component
 * @example
 * // Rendered within Portfolio.js Performance tab
 * {currentTab === 2 && <PortfolioPerformanceChart />}
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';
import api from '../../services/apiAxios';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
const PortfolioPerformanceChart = () => {
  const { portfolio } = usePortfolio();
  const [timeframe, setTimeframe] = useState('YTD');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Baseline for green/red split
  const baseline = portfolio?.initial_investment || 10000;

  // Supported timeframes (portfolio-specific: YTD is max)
  const timeframes = ['1D', '5D', '1M', '3M', '6M', 'YTD'];

  // Fetch portfolio history data
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await api.getPortfolioHistory(timeframe);

        if (!data || !data.data_points || data.data_points.length === 0) {
          setHistoryData([]);
          setLoading(false);
          return;
        }

        // Transform data for Recharts
        const chartData = data.data_points.map((point) => {
          const value = parseFloat(point.portfolio_value);
          const gainLoss = value - baseline;
          const gainLossPercent = baseline > 0 ? (gainLoss / baseline) * 100 : 0;

          return {
            // Localize timestamp to viewer's timezone
            timestamp: new Date(point.timestamp),
            displayDate: formatShortDate(point.timestamp),
            value: value,
            gainLoss: gainLoss,
            gainLossPercent: gainLossPercent,
            baseline: baseline,
          };
        });

        setHistoryData(chartData);
      } catch (err) {
        console.error('Failed to fetch portfolio history:', err);
        setError('Failed to load performance data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (portfolio) {
      fetchHistory();
    }
  }, [timeframe, portfolio, baseline]);

  const handleTimeframeChange = (_event, newTimeframe) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
    }
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const data = payload[0].payload;
    const isGain = data.gainLoss >= 0;

    return (
      <Card sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.98)' }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          {data.timestamp.toLocaleString()}
        </Typography>

        {/* 1. Total Value */}
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Total Value: {formatCurrency(data.value)}
        </Typography>

        {/* 2. Total Gain/Loss */}
        <Typography
          variant="body2"
          color={isGain ? 'success.main' : 'error.main'}
          gutterBottom
        >
          Gain/Loss: {isGain ? '+' : ''}
          {formatCurrency(data.gainLoss)}
        </Typography>

        {/* 3. Total Gain/Loss % */}
        <Typography
          variant="body2"
          color={isGain ? 'success.main' : 'error.main'}
        >
          Gain/Loss %: {isGain ? '+' : ''}
          {data.gainLossPercent.toFixed(2)}%
        </Typography>
      </Card>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Box textAlign="center" py={6}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Loading performance data...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  // Empty state
  if (!historyData || historyData.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No performance data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Start trading to see your portfolio performance over time
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Title */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Portfolio Performance
        </Typography>
      </Box>

      {/* Summary Statistics Cards with Timeframe Toggle */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Initial Investment
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {formatCurrency(baseline)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Value
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {formatCurrency(portfolio?.total_portfolio_value || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Gain/Loss
              </Typography>
              <Typography
                variant="h5"
                fontWeight={600}
                color={
                  portfolio?.total_gain_loss >= 0 ? 'success.main' : 'error.main'
                }
              >
                {portfolio?.total_gain_loss >= 0 ? '+' : ''}
                {formatCurrency(portfolio?.total_gain_loss || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Return
              </Typography>
              <Typography
                variant="h5"
                fontWeight={600}
                color={
                  parseFloat(portfolio?.total_gain_loss_percentage || 0) >= 0
                    ? 'success.main'
                    : 'error.main'
                }
              >
                {parseFloat(portfolio?.total_gain_loss_percentage || 0) >= 0 ? '+' : ''}
                {parseFloat(portfolio?.total_gain_loss_percentage || 0).toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Timeframe Toggle as 5th Grid Item - Uses flexGrow to push to far right */}
        <Grid item xs={12} md="auto" sx={{ flexGrow: { md: 1 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: { xs: 'center', md: 'flex-end' },
              alignItems: 'center',
              height: '100%',
            }}
          >
            <ToggleButtonGroup
              value={timeframe}
              exclusive
              onChange={handleTimeframeChange}
              aria-label="timeframe selection"
              size="small"
            >
              {timeframes.map((tf) => (
                <ToggleButton
                  key={tf}
                  value={tf}
                  aria-label={`${tf} timeframe`}
                  sx={{
                    px: 2,
                    py: 1,
                    fontWeight: 500,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  {tf}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Grid>
      </Grid>

      <Card sx={{ p: 3 }}>
        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={historyData}
            margin={{ top: 10, right: 75, left: 0, bottom: 0 }}
          >
            <defs>
              {/* Purple gradient for portfolio performance - matches primary theme */}
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5B4FDB" stopOpacity={0.85} />
                <stop offset="50%" stopColor="#7C3AED" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis
              dataKey="displayDate"
              stroke="#666"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#666' }}
            />

            <YAxis
              stroke="#666"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#666' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Baseline reference line */}
            <ReferenceLine
              y={baseline}
              stroke="#666"
              strokeDasharray="5 5"
              label={{
                value: `~${formatCurrency(baseline)}`,
                position: 'right',
                fill: '#666',
                fontSize: 12,
              }}
            />

            {/* Area with purple gradient fill */}
            <Area
              type="monotone"
              dataKey="value"
              stroke="#5B4FDB"
              strokeWidth={2.5}
              fill="url(#colorPortfolio)"
              fillOpacity={1}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </Box>
  );
};

export default PortfolioPerformanceChart;
