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
import api from '../../services/api';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

/**
 * Portfolio Performance Chart Component
 *
 * Displays portfolio value over time with green/red fill split based on initial_investment baseline.
 *
 * Features:
 * - Timeframe selection: 1D, 5D, 1M, 3M, 6M, YTD (max for portfolio)
 * - Pre-inception: flat at initial_investment
 * - Post-inception: mark-to-market (cash + holdings)
 * - Custom tooltip: Total Value, Gain/Loss, Gain/Loss %
 * - Localized timestamps
 */
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
