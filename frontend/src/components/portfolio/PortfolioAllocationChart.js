/**
 * Portfolio Allocation Chart Component - Asset Distribution Pie Chart
 *
 * Displays portfolio holdings as interactive pie chart with percentage labels, color-coded
 * segments, summary statistics cards, and asset breakdown legend. Shows visual distribution
 * of portfolio value across different cryptocurrencies.
 *
 * **Features:**
 * - Pie Chart: Holdings value distribution with percentage labels (>3% shown)
 * - Summary Cards: Total Holdings Value, Number of Assets, Largest Holding
 * - Asset Legend: Color-coded breakdown with value and percentage for each asset
 * - Custom Tooltip: Full name, symbol, value, percentage, quantity on hover
 * - Empty State: Message when no holdings exist
 *
 * **Color Scheme:**
 * - 10 purple/violet shades matching project theme
 * - Colors cycle if more than 10 holdings (uses modulo)
 * - Primary: #5B4FDB, #7C3AED, #A78BFA, #C084FC, #8B5CF6, etc.
 * - Consistent with PortfolioPerformanceChart gradient
 *
 * **Chart Data Transformation:**
 * - Source: holdings array from PortfolioContext
 * - Transform: Map each holding to { name, fullName, value, quantity, percentage }
 * - name: cryptocurrency.symbol (e.g., "BTC")
 * - fullName: cryptocurrency.name (e.g., "Bitcoin")
 * - value: parseFloat(holding.current_value)
 * - quantity: parseFloat(holding.quantity) with 8 decimal precision
 * - percentage: (current_value / total_portfolio_value) * 100
 *
 * **Percentage Label Rendering:**
 * - Only shows label if segment > 3% (percent >= 0.03)
 * - Prevents label overlap for small holdings
 * - Positioned at midpoint of segment radius
 * - White text (#FFFFFF) with bold font (fontWeight 600)
 * - Format: "12.3%" (1 decimal place)
 *
 * **Summary Cards (3 cards):**
 * 1. Total Holdings Value: portfolio.total_holdings_value (formatted currency)
 * 2. Number of Assets: holdings.length (integer count)
 * 3. Largest Holding: symbol + percentage (e.g., "BTC (+45.2%)")
 *    • Calculated: Max value from chartData array
 *    • Uses reduce() to find holding with highest value
 *
 * **Asset Breakdown Legend:**
 * - Positioned above chart (mb: -5 for overlap reduction)
 * - Flexbox layout with wrap, centered, gap: 0, minWidth: 200px per item
 * - Color square (16x16px) + text info for each asset
 * - Text lines:
 *   1. Full name + symbol (e.g., "Bitcoin (BTC)")
 *   2. Value + percentage (e.g., "$4,523.45 • +45.2%")
 * - Color square matches pie segment color (COLORS[index % COLORS.length])
 *
 * **Custom Tooltip:**
 * - Displays on hover over pie segments
 * - Full name + symbol (e.g., "Bitcoin (BTC)")
 * - Value: Formatted currency
 * - Percentage: formatPercentage(percentage / 100) - adjusts for decimal input
 * - Quantity: Fixed 8 decimal places (standard crypto precision)
 * - Paper background with semi-transparent white (0.95 opacity)
 *
 * **Empty State:**
 * - Displays when holdings array is empty or null
 * - Message: "No holdings to display. Start trading to see your allocation!"
 * - Centered layout with py: 6 spacing
 *
 * **Chart Sizing:**
 * - ResponsiveContainer: 100% width, 700px height (large chart for readability)
 * - Pie outerRadius: 70% (leaves margin for labels)
 * - Center: 50% x, 50% y (perfect centering)
 * - labelLine: false (no lines connecting labels to segments)
 *
 * **Performance Considerations:**
 * - chartData calculated on every render (small array, fast)
 * - largestHolding calculated via reduce (O(n) but n is small)
 * - Recharts uses virtualization (no performance issues with <100 holdings)
 * - No auto-refresh (data comes from PortfolioContext WebSocket updates)
 *
 * **Responsive Design:**
 * - Grid: 3 cards at md+ (4 columns each), stacked on mobile (xs: 12)
 * - Asset legend: Wraps on small screens (flexWrap: 'wrap')
 * - Chart height fixed at 700px (may overflow on small devices)
 *
 * **Data Source:**
 * - holdings: From PortfolioContext (fetched on mount, updated on trades/WebSocket)
 * - portfolio: From PortfolioContext (for total_holdings_value and total_portfolio_value)
 * - No direct API calls (data already in context)
 *
 * **Backend Integration:**
 * - Holdings data: GET /api/trading/holdings
 * - Portfolio summary: GET /api/trading/portfolio/summary
 * - Both fetched by PortfolioContext on mount
 *
 * **Related Components:**
 * - Portfolio.js: Parent page with Allocation tab containing this chart
 * - PortfolioPerformanceChart.js: Sibling component (Performance tab)
 * - usePortfolio hook: Provides holdings and portfolio data
 *
 * **Edge Cases:**
 * - No holdings: Shows empty state
 * - Single holding: Shows 100% pie chart
 * - Many holdings (>10): Colors cycle via modulo
 * - Small holdings (<3%): No label shown on pie segment
 * - Zero portfolio value: percentage = 0 (division by zero prevented)
 *
 * @component
 * @example
 * // Rendered within Portfolio.js Allocation tab
 * {currentTab === 1 && <PortfolioAllocationChart />}
 */
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Box, Typography, Paper, Grid, Card, CardContent } from '@mui/material';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

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
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        {/* Asset Allocation Breakdown */}
        <Box sx={{ mb: -5, display: 'flex', flexWrap: 'wrap', gap: 0, justifyContent: 'center' }}>
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
        <ResponsiveContainer width="100%" height={700}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius="70%"
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
