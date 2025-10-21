import { useState } from 'react';
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
  Button,
} from '@mui/material';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency, formatPercentage, formatCryptoQuantity } from '../../utils/formatters';
import TradeModal from '../TradeModal';

const HoldingsList = () => {
  const { holdings } = usePortfolio();
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [tradeType, setTradeType] = useState('buy');

  const handleOpenTrade = (holding, type) => {
    setSelectedCrypto(holding.cryptocurrency);
    setTradeType(type);
    setTradeModalOpen(true);
  };

  const handleCloseTrade = () => {
    setTradeModalOpen(false);
    setSelectedCrypto(null);
  };

  if (!holdings || holdings.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary">
          No holdings yet. Start trading to build your portfolio!
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Avg. Price</TableCell>
              <TableCell align="right">Current Price</TableCell>
              <TableCell align="right">Total Value</TableCell>
              <TableCell align="right">Gain/Loss</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holdings.map((holding) => (
              <TableRow key={holding.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      src={holding.cryptocurrency.icon_url}
                      alt={holding.cryptocurrency.symbol}
                      sx={{ width: 32, height: 32 }}
                    />
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {holding.cryptocurrency.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {holding.cryptocurrency.name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatCryptoQuantity(holding.quantity)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatCurrency(holding.average_purchase_price)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatCurrency(holding.cryptocurrency.current_price)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(holding.current_value)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={holding.gain_loss >= 0 ? 'success.main' : 'error.main'}
                    >
                      {formatCurrency(holding.gain_loss)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={holding.gain_loss >= 0 ? 'success.main' : 'error.main'}
                    >
                      {formatPercentage(holding.gain_loss_percentage)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={() => handleOpenTrade(holding, 'buy')}
                    >
                      Buy
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleOpenTrade(holding, 'sell')}
                    >
                      Sell
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TradeModal
        open={tradeModalOpen}
        onClose={handleCloseTrade}
        cryptocurrency={selectedCrypto}
        tradeType={tradeType}
      />
    </>
  );
};

export default HoldingsList;
