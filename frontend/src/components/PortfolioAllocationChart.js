import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Box, Typography, Paper } from '@mui/material';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatPercentage } from '../utils/formatters';

// Define colors for different holdings
const COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Teal
  '#FFBB28', // Yellow
  '#FF8042', // Orange
  '#8884D8', // Purple
  '#82CA9D', // Green
  '#FFC658', // Gold
  '#FF6B9D', // Pink
  '#C084FC', // Violet
  '#38BDF8', // Sky Blue
];

const PortfolioAllocationChart = () => {
  const { holdings, portfolio } = usePortfolio();

  // Transform holdings data for the pie chart
  const chartData = holdings.map((holding) => ({
    name: holding.cryptocurrency.symbol,
    fullName: holding.cryptocurrency.name,
    value: parseFloat(holding.current_value),
    quantity: parseFloat(holding.quantity),
    percentage: portfolio?.total_portfolio_value
      ? (parseFloat(holding.current_value) / parseFloat(portfolio.total_portfolio_value)) * 100
      : 0,
  }));

  // Custom label renderer
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant enough (> 3%)
    if (percent < 0.03) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {data.fullName} ({data.name})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Value: {formatCurrency(data.value)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Percentage: {formatPercentage(data.percentage / 100)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quantity: {data.quantity.toFixed(8)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  if (!holdings || holdings.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary">
          No holdings to display. Start trading to see your allocation!
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight={600} mb={3}>
        Portfolio Allocation
      </Typography>

      <Paper sx={{ p: 4, borderRadius: 2 }}>
        {/* Summary Statistics */}
        <Box sx={{ mb: 4, display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary">
            Total Holdings Value
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {formatCurrency(portfolio?.total_holdings_value || 0)}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary">
            Number of Assets
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {holdings.length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary">
            Largest Holding
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {chartData.length > 0
              ? `${chartData.reduce((max, h) => h.value > max.value ? h : max).name} (${formatPercentage(chartData.reduce((max, h) => h.value > max.value ? h : max).percentage / 100)})`
              : 'N/A'}
          </Typography>
        </Paper>
      </Box>

      {/* Asset Allocation Breakdown */}
      <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
        {chartData.map((data, index) => (
          <Box
            key={`asset-${index}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: '200px',
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                backgroundColor: COLORS[index % COLORS.length],
                borderRadius: '2px',
              }}
            />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {data.fullName} ({data.name})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(data.value)} • {formatPercentage(data.percentage / 100)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={500}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default PortfolioAllocationChart;
