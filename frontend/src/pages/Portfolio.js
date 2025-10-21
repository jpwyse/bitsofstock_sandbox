/**
 * Portfolio Dashboard Page
 *
 * Main portfolio management page displaying portfolio summary metrics, holdings,
 * allocation charts, performance graphs, realized gains, and transaction history.
 * Provides tabbed interface for different portfolio views.
 *
 * Features:
 * - Portfolio Summary: Total value, gain/loss, cash balance (3 metric cards)
 * - Tabbed Views:
 *   1. Holdings: Current crypto positions with P&L
 *   2. Allocation: Pie chart showing portfolio distribution
 *   3. Performance: Line chart of portfolio value over time (timeframes: 1D, 5D, 1M, 3M, 6M, YTD)
 *   4. Gains/Losses: Table of realized P&L from SELL transactions
 *   5. Transactions: Paginated history of all buy/sell trades
 *
 * Data Sources:
 * - PortfolioContext: Provides portfolio summary via /api/portfolio/summary
 *   • Real-time updates via WebSocket for price changes
 *   • Auto-refresh on trades (buy/sell) and transfers
 * - Child components fetch additional data:
 *   • HoldingsList: /api/holdings
 *   • PortfolioPerformanceChart: /api/portfolio/history
 *   • RealizedGainsTable: Filters transactions for SELL type
 *   • TransactionsList: /api/transactions with pagination
 *
 * State Management:
 * - currentTab: Active tab index (0-4) for view selection
 * - loading: From PortfolioContext, shows spinner during initial data fetch
 *
 * Color Semantics:
 * - Green (success.main): Positive gains
 * - Red (error.main): Losses
 * - Applied to gain/loss values and percentages
 *
 * Layout:
 * - Max width: 90% (narrower than News.js which is 80%)
 * - Centered with auto margins (mx: 'auto')
 * - Horizontal padding: 2 (theme spacing units)
 * - Responsive grid: 12 columns on mobile, 4 columns each on desktop (md+)
 *
 * Loading State:
 * - Displays centered CircularProgress spinner while portfolio data fetches
 * - Min height: 80vh for vertical centering
 * - No content shown until loading completes
 *
 * Performance Considerations:
 * - Portfolio summary loaded once via PortfolioContext
 * - Tab content lazy-rendered (only active tab component mounted)
 * - Child components handle their own data fetching
 * - WebSocket updates trigger re-render for real-time price changes
 *
 * Navigation:
 * - Accessed via main app navigation (/portfolio route)
 * - Primary dashboard view for authenticated users
 *
 * Timeframe Limits:
 * - Performance chart capped at YTD (year-to-date) as maximum lookback
 * - Market/asset charts may support longer ranges (1Y, 5Y, MAX)
 * - Restriction specific to portfolio time-series data
 *
 * Related Components:
 * - PortfolioContext: Global state provider
 * - HoldingsList: Crypto positions table
 * - PortfolioAllocationChart: Pie chart (Recharts)
 * - PortfolioPerformanceChart: Line chart (Recharts) with timeframe selector
 * - RealizedGainsTable: P&L history table
 * - TransactionsList: Trade history with pagination
 *
 * @component
 * @example
 * // Rendered by React Router at /portfolio route
 * <Route path="/portfolio" element={<Portfolio />} />
 */
import { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import HoldingsList from '../components/portfolio/HoldingsList';
import PortfolioAllocationChart from '../components/portfolio/PortfolioAllocationChart';
import PortfolioPerformanceChart from '../components/portfolio/PortfolioPerformanceChart';
import RealizedGainsTable from '../components/portfolio/RealizedGainsTable';
import TransactionsList from '../components/portfolio/TransactionsList';

const Portfolio = () => {
  const { portfolio, loading } = usePortfolio();
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, pb: 6 }}>
      {/* Portfolio Summary */}
      <Box
        mb={4}
        sx={{
          maxWidth: '90%',
          mx: 'auto',
          px: 2
        }}
      >
        <Typography variant="h3" gutterBottom fontWeight={700}>
          Portfolio Overview
        </Typography>

        <Grid container spacing={3} mt={1}>
          {/* Total Portfolio Value */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Portfolio Value
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {formatCurrency(portfolio?.total_portfolio_value)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Gain/Loss */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Gain/Loss
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color={portfolio?.total_gain_loss >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(portfolio?.total_gain_loss)}
                </Typography>
                <Typography
                  variant="body2"
                  color={portfolio?.total_gain_loss >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatPercentage(portfolio?.total_gain_loss_percentage)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Cash Balance */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Cash Balance
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {formatCurrency(portfolio?.cash_balance)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs for Dashboard Views */}
      <Box
        sx={{
          maxWidth: '90%',
          mx: 'auto',
          px: 2
        }}
      >
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Holdings" />
          <Tab label="Allocation" />
          <Tab label="Performance" />
          <Tab label="Gains/Losses" />
          <Tab label="Transactions" />
        </Tabs>

        {currentTab === 0 && <HoldingsList />}
        {currentTab === 1 && <PortfolioAllocationChart />}
        {currentTab === 2 && <PortfolioPerformanceChart />}
        {currentTab === 3 && <RealizedGainsTable />}
        {currentTab === 4 && <TransactionsList />}
      </Box>
    </Container>
  );
};

export default Portfolio;
