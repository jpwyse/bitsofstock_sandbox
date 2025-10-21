/**
 * News Page - Portfolio Snapshot and Cryptocurrency News Feed
 *
 * Combined page displaying quick portfolio summary metrics alongside latest cryptocurrency
 * news articles from Finnhub. Provides manual refresh capability for news feed.
 *
 * Features:
 * - Portfolio Snapshot: Condensed 3-card summary (value, gain/loss, cash)
 * - Market News: Latest cryptocurrency news articles with:
 *   • Headlines, images, summaries
 *   • Publication timestamps
 *   • External article links
 *   • Manual refresh button
 *
 * Data Sources:
 * - PortfolioContext: Provides portfolio summary via /api/portfolio/summary
 *   • Same data as Portfolio.js header
 *   • Real-time updates via WebSocket for price changes
 * - CryptoNewsList component:
 *   • Fetches /api/news/crypto via useCryptoNews hook
 *   • Finnhub API backend integration (60 calls/min free tier)
 *   • Returns 10 articles by default (configurable limit)
 *
 * State Management:
 * - newsRefetch: Function reference for manual refresh
 *   • Set by CryptoNewsList via onRefetchReady callback
 *   • Triggered by refresh IconButton click
 *   • Re-fetches news from Finnhub
 * - loading: From PortfolioContext, shows spinner during initial data fetch
 *
 * Layout:
 * - Max width: 80% (narrower than Market.js full width, narrower than Portfolio.js 90%)
 * - Centered with auto margins (mx: 'auto')
 * - Horizontal padding: 2 (theme spacing units)
 * - Portfolio snapshot at top, news feed below with gap (mt: 6)
 * - Responsive grid: 12 columns on mobile, 4 columns each on desktop (md+)
 *
 * Color Semantics:
 * - Green (success.main): Positive gains
 * - Red (error.main): Losses
 * - Applied to gain/loss values and percentages
 *
 * Refresh Button:
 * - Icon: RefreshIcon (Material-UI)
 * - Disabled until newsRefetch function provided by CryptoNewsList
 * - Accessibility: aria-label for screen readers
 * - Focus indicator: 2px outline in primary color
 * - Triggers manual re-fetch (does not auto-refresh)
 *
 * Loading State:
 * - Displays centered CircularProgress spinner while portfolio data fetches
 * - Min height: 80vh for vertical centering
 * - News component handles its own loading state separately
 *
 * Performance Considerations:
 * - Portfolio data loaded once via PortfolioContext (shared with Portfolio.js)
 * - News articles loaded once on mount, cached in useCryptoNews hook
 * - Manual refresh bypasses cache (re-fetches from backend)
 * - WebSocket updates portfolio metrics in real-time
 *
 * Navigation:
 * - Accessed via main app navigation (/news route)
 * - Alternative dashboard view with news context
 *
 * News Article Handling:
 * - HTML sanitization: Backend strips HTML tags from summaries
 * - Empty images: Gracefully handled with placeholder or hidden
 * - External links: Open in new tab (target="_blank", rel="noopener noreferrer")
 * - Timestamps: Converted from UNIX to human-readable format
 *
 * Related Components:
 * - PortfolioContext: Global state provider
 * - CryptoNewsList: News feed component with useCryptoNews hook
 * - useCryptoNews: Custom hook for Finnhub news fetching
 *
 * Finnhub Integration:
 * - Rate limits: Free tier 60 calls/min
 * - Error handling: 502 Bad Gateway on upstream failure
 * - Data sanitization: HTML entities decoded, tags stripped
 * - See backend/trading/services/finnhub.py for full details
 *
 * @component
 * @example
 * // Rendered by React Router at /news route
 * <Route path="/news" element={<News />} />
 */
import { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import CryptoNewsList from '../components/news/CryptoNewsList';

const News = () => {
  const { portfolio, loading } = usePortfolio();
  const [newsRefetch, setNewsRefetch] = useState(null);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, pb: 6 }}>
      {/* Portfolio Summary - Centered with 80% Width to match News section */}
      <Box
        mb={4}
        sx={{
          maxWidth: '80%',
          mx: 'auto',
          px: 2
        }}
      >
        <Typography variant="h3" gutterBottom fontWeight={700}>
          Portfolio Snapshot
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

      {/* Crypto News - Centered with 80% Width */}
      <Box
        mt={6}
        sx={{
          maxWidth: '80%',
          mx: 'auto',
          px: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Market News
          </Typography>
          <IconButton
            onClick={() => newsRefetch && newsRefetch()}
            disabled={!newsRefetch}
            color="primary"
            aria-label="Refresh news"
            sx={{
              '&:focus': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: '2px',
              },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        <CryptoNewsList onRefetchReady={setNewsRefetch} />
      </Box>
    </Container>
  );
};

export default News;
