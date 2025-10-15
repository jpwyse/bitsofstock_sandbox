import React, { useState } from 'react';
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
import HoldingsList from '../components/HoldingsList';
import CryptocurrencyList from '../components/CryptocurrencyList';

const Dashboard = () => {
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Portfolio Summary */}
      <Box mb={4}>
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

      {/* Tabs for Holdings and Market */}
      <Box>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="My Holdings" />
          <Tab label="Market" />
        </Tabs>

        {currentTab === 0 && <HoldingsList />}
        {currentTab === 1 && <CryptocurrencyList />}
      </Box>
    </Container>
  );
};

export default Dashboard;
