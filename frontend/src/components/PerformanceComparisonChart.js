import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import apiService from '../services/api';
import { formatCurrency, formatPercent, formatShortDate } from '../utils/formatters';

const PerformanceComparisonChart = () => {
  const [timeframe, setTimeframe] = useState('YTD');
  const [mode, setMode] = useState('actual');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComparisonData();
  }, [timeframe, mode]);

  const calculateStartDate = (tf) => {
    const now = new Date();
    const start = new Date();

    switch (tf) {
      case '1D':
        start.setDate(now.getDate() - 1);
        break;
      case '5D':
        start.setDate(now.getDate() - 5);
        break;
      case '1M':
        start.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        start.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        start.setMonth(now.getMonth() - 6);
        break;
      case 'YTD':
        start.setMonth(0, 1);
        break;
      default:
        start.setMonth(0, 1);
    }

    return start.toISOString().split('T')[0];
  };

  const fetchComparisonData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = calculateStartDate(timeframe);
      const response = await apiService.getPerformanceComparison(startDate, null, mode);

      if (response.error) {
        setError(response.message || 'Failed to fetch comparison data');
        setData(null);
      } else {
        setData(response);
      }
    } catch (err) {
      console.error('Error fetching comparison data:', err);
      setError('Failed to fetch comparison data. Please try again.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" fontWeight={600} gutterBottom>
            {formatShortDate(label)}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color, mt: 0.5 }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight={600} mb={3}>
        Performance Comparison
      </Typography>

      <Paper sx={{ p: 4, borderRadius: 2 }}>
        {/* Header with Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Performance vs Bitcoin
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Mode Toggle */}
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, newMode) => newMode && setMode(newMode)}
              size="small"
            >
              <ToggleButton value="actual">Actual</ToggleButton>
              <ToggleButton value="hypothetical">Hypothetical</ToggleButton>
            </ToggleButtonGroup>

            {/* Timeframe Toggle */}
            <ToggleButtonGroup
              value={timeframe}
              exclusive
              onChange={(e, newTimeframe) => newTimeframe && setTimeframe(newTimeframe)}
              size="small"
            >
              <ToggleButton value="1D">1D</ToggleButton>
              <ToggleButton value="5D">5D</ToggleButton>
              <ToggleButton value="1M">1M</ToggleButton>
              <ToggleButton value="3M">3M</ToggleButton>
              <ToggleButton value="6M">6M</ToggleButton>
              <ToggleButton value="YTD">YTD</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Info Message Alert */}
        {data.message && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {data.message}
          </Alert>
        )}

        {/* Suggestion Message Alert */}
        {data.suggestion && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {data.suggestion}
          </Alert>
        )}

        {/* Performance Metrics - TWO CARDS ONLY */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Your Portfolio */}
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Your Portfolio
              </Typography>
              <Typography variant="h5" fontWeight={600} color="primary" sx={{ my: 1 }}>
                {formatPercent(data.portfolio.return_pct)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(data.portfolio.return_amount)}
              </Typography>
            </Box>
          </Grid>

          {/* Bitcoin ONLY */}
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Bitcoin
              </Typography>
              <Typography variant="h5" fontWeight={600} sx={{ my: 1 }}>
                {formatPercent(data.bitcoin.return_pct)}
              </Typography>
              <Chip
                icon={data.bitcoin.outperformance < 0 ? <TrendingDown fontSize="small" /> : <TrendingUp fontSize="small" />}
                label={`${formatPercent(Math.abs(data.bitcoin.outperformance))} ${data.bitcoin.outperformance < 0 ? 'behind' : 'ahead'}`}
                size="small"
                color={data.bitcoin.outperformance < 0 ? 'error' : 'success'}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Recharts LineChart - TWO LINES ONLY */}
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data.time_series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />

            <XAxis
              dataKey="timestamp"
              tickFormatter={(timestamp) => formatShortDate(timestamp)}
              stroke="#666666"
              style={{ fontSize: '12px' }}
            />

            <YAxis
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              stroke="#666666"
              style={{ fontSize: '12px' }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend />

            {/* Line 1: Your Portfolio */}
            <Line
              type="monotone"
              dataKey="portfolio_value"
              stroke="#5B4FDB"
              strokeWidth={2}
              name="Your Portfolio"
              dot={false}
            />

            {/* Line 2: Bitcoin ONLY */}
            <Line
              type="monotone"
              dataKey="bitcoin_normalized"
              stroke="#F7931A"
              strokeWidth={2}
              name="Bitcoin"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default PerformanceComparisonChart;
