import React from 'react';
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
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatCryptoQuantity, formatDate } from '../utils/formatters';

const TransactionsList = () => {
  const { transactions } = usePortfolio();

  if (!transactions || transactions.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary">
          No transactions yet. Start trading to see your transaction history!
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Title and Summary Cards */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={600}>
          Transaction History
        </Typography>

        {/* Transaction Summary Cards */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Total Transactions
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {transactions.length}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Buy Orders
            </Typography>
            <Typography variant="h6" fontWeight={600} color="success.main">
              {transactions.filter(t => t.type === 'BUY').length}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Sell Orders
            </Typography>
            <Typography variant="h6" fontWeight={600} color="error.main">
              {transactions.filter(t => t.type === 'SELL').length}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Asset</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Price per Unit</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell align="right">Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
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

                {/* Total Amount */}
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={transaction.type === 'BUY' ? 'error.main' : 'success.main'}
                  >
                    {transaction.type === 'BUY' ? '-' : '+'}
                    {formatCurrency(transaction.total_amount)}
                  </Typography>
                </TableCell>

                {/* Date */}
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(transaction.timestamp)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TransactionsList;
