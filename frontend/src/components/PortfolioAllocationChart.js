import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Box, Typography, Paper, Grid, Card, CardContent } from '@mui/material';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatPercentage } from '../utils/formatters';

// Updated colors to match project theme (purple/violet shades)
const COLORS = [
  '#5B4FDB', // Primary purple
  '#7C3AED', // Medium purple
  '#A78BFA', // Light purple
  '#C084FC', // Violet
  '#8B5CF6', // Deep violet
  '#9333EA', // Rich purple
  '#6366F1', // Indigo
  '#818CF8', // Light indigo
  '#A855F7', // Bright purple
  '#D946EF', // Fuchsia
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

  // Calculate largest holding data
  const largestHolding = chartData.length > 0
    ? chartData.reduce((max, h) => h.value > max.value ? h : max)
    : null;

  return (
    <Box>
      {/* Header with Title */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Portfolio Allocation
        </Typography>
      </Box>

      {/* Summary Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Holdings Value
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {formatCurrency(portfolio?.total_holdings_value || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Number of Assets
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {holdings.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Largest Holding
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {largestHolding
                  ? `${largestHolding.name} (${formatPercentage(largestHolding.percentage / 100)})`
                  : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart Container */}
      <Paper sx={{ p: 4, borderRadius: 2 }}>
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

        {/* Pie Chart - Larger size */}
        <ResponsiveContainer width="100%" height={600}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={200}
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
