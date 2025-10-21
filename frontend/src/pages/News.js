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
