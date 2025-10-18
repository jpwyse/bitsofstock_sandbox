import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import api from '../services/api';
import { formatCurrency, formatCurrencyWithSign, formatCryptoQuantity, formatDate } from '../utils/formatters';

const RealizedGainsTable = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('SELL'); // Default to SELL view

  // Fetch transactions based on filter mode
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.getTransactions(1, filterMode);
        // Handle paginated response from Django Ninja
        const txnData = response.items || response.results || response || [];
        setTransactions(txnData);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load realized gains/losses data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [filterMode]);

  const handleFilterChange = (_event, newFilter) => {
    if (newFilter !== null) {
      setFilterMode(newFilter);
    }
  };

  // Calculate summary statistics
  const totalRealizedGains = transactions
    .filter(t => t.realized_gain_loss > 0)
    .reduce((sum, t) => sum + parseFloat(t.realized_gain_loss || 0), 0);

  const totalRealizedLosses = Math.abs(
    transactions
      .filter(t => t.realized_gain_loss < 0)
      .reduce((sum, t) => sum + parseFloat(t.realized_gain_loss || 0), 0)
  );

  const netRealizedPnL = transactions.reduce(
    (sum, t) => sum + parseFloat(t.realized_gain_loss || 0),
    0
  );

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
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
  if (!transactions || transactions.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {filterMode === 'SELL'
            ? 'No realized gains or losses yet'
            : 'No transactions yet'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {filterMode === 'SELL'
            ? 'Sell some crypto to see realized P&L here!'
            : 'Start trading to see your transaction history!'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Title */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Realized Gains & Losses
        </Typography>
      </Box>

      {/* Summary Statistics Cards and Filter Toggle */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingUpIcon color="success" />
                <Typography variant="body2" color="text.secondary">
                  Total Realized Gains
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={600} color="success.main">
                {formatCurrency(totalRealizedGains)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingDownIcon color="error" />
                <Typography variant="body2" color="text.secondary">
                  Total Realized Losses
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={600} color="error.main">
                {formatCurrency(totalRealizedLosses)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <ShowChartIcon color={netRealizedPnL >= 0 ? 'success' : 'error'} />
                <Typography variant="body2" color="text.secondary">
                  Net Realized P&L
                </Typography>
              </Box>
              <Typography
                variant="h5"
                fontWeight={600}
                color={netRealizedPnL >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrencyWithSign(netRealizedPnL)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Filter Toggle as 4th Grid Item - Uses flexGrow to push to far right */}
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
              value={filterMode}
              exclusive
              onChange={handleFilterChange}
              aria-label="transaction filter"
              size="small"
            >
              <ToggleButton
                value="SELL"
                aria-label="show only realized gains/losses"
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
                Realized Only
              </ToggleButton>
              <ToggleButton
                value="ALL"
                aria-label="show all trades"
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
                All Trades
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Grid>
      </Grid>

      {/* Realized Gains/Losses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Asset</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Price / Unit</TableCell>
              <TableCell align="right">Realized Gain / Loss</TableCell>
              <TableCell align="right">Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => {
              const realizedPnL = parseFloat(transaction.realized_gain_loss || 0);
              const pnlColor =
                realizedPnL > 0
                  ? 'success.main'
                  : realizedPnL < 0
                  ? 'error.main'
                  : 'text.secondary';

              return (
                <TableRow key={transaction.id} hover>
                  {/* Transaction Type */}
                  <TableCell>
                    <Chip
                      icon={
                        transaction.type === 'BUY' ? (
                          <TrendingUpIcon />
                        ) : (
                          <TrendingDownIcon />
                        )
                      }
                      label={transaction.type}
                      color={transaction.type === 'BUY' ? 'success' : 'error'}
                      size="small"
                      sx={{ fontWeight: 600, minWidth: 80 }}
                    />
                  </TableCell>

                  {/* Asset Information */}
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        src={transaction.cryptocurrency.icon_url}
                        alt={transaction.cryptocurrency.symbol}
                        sx={{ width: 32, height: 32 }}
                      />
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {transaction.cryptocurrency.symbol}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.cryptocurrency.name}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Quantity */}
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                      {formatCryptoQuantity(transaction.quantity)}
                    </Typography>
                  </TableCell>

                  {/* Price per Unit */}
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatCurrency(transaction.price_per_unit)}
                    </Typography>
                  </TableCell>

                  {/* Realized Gain/Loss */}
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color={pnlColor}>
                      {formatCurrencyWithSign(realizedPnL)}
                    </Typography>
                  </TableCell>

                  {/* Date */}
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(transaction.timestamp)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RealizedGainsTable;
