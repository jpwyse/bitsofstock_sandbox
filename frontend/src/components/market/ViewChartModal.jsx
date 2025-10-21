import { useState, useEffect } from 'react';
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
import apiService from '../../services/api';

const ViewChartModal = ({ open, onClose, crypto }) => {
  const [timeframe, setTimeframe] = useState('1Y');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Timeframe options
  const timeframes = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

  // Fetch data when modal opens or timeframe changes
  useEffect(() => {
    if (open && crypto) {
      fetchChartData();
    }
  }, [open, crypto, timeframe]);

  const fetchChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getCryptoPriceHistory(crypto.symbol, timeframe);
      // Convert price strings to numbers for charting
      const normalizedData = data.map((point) => ({
        ...point,
        price: parseFloat(point.price),
      }));
      setChartData(normalizedData);
    } catch (err) {
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  // Reset timeframe when modal opens
  useEffect(() => {
    if (open) {
      setTimeframe('1Y');
      setError(null);
    }
  }, [open]);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
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
            {payload[0].payload.date}
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
  const formatXAxisDate = (dateStr) => {
    try {
      const date = parse(dateStr, 'yyyy-MM-dd', new Date());

      // Different formats based on timeframe
      if (timeframe === '1D' || timeframe === '5D') {
        return format(date, 'MMM d, h:mm a');
      } else if (timeframe === '1M' || timeframe === '3M') {
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
