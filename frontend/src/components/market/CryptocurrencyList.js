import { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatCurrency, formatPercentage, formatLargeNumber } from '../../utils/formatters';
import TradeModal from '../TradeModal';
import ViewChartModal from './ViewChartModal';
import apiService from '../../services/api';

const CryptocurrencyList = ({ category = null, sortBy = null }) => {
  const [allCryptocurrencies, setAllCryptocurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewSelectedCrypto, setViewSelectedCrypto] = useState(null);

  // Fetch all cryptocurrencies once on mount
  useEffect(() => {
    const fetchCryptocurrencies = async () => {
      setLoading(true);
      try {
        const data = await apiService.getCryptocurrencies();
        setAllCryptocurrencies(data);
      } catch (err) {
        console.error('Error fetching cryptocurrencies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCryptocurrencies();
  }, []); // Empty dependency array - fetch only once

  // Filter cryptocurrencies based on category prop
  const filteredCryptos = category
    ? allCryptocurrencies.filter(crypto => crypto.category === category)
    : allCryptocurrencies;

  // Sort based on sortBy prop
  let cryptocurrencies = [...filteredCryptos]; // Create copy to avoid mutating

  if (sortBy === 'volume') {
    // Sort by volume_24h (descending - highest first)
    cryptocurrencies.sort((a, b) => {
      const volumeA = parseFloat(a.volume_24h || 0);
      const volumeB = parseFloat(b.volume_24h || 0);
      return volumeB - volumeA;
    });
  } else if (sortBy === 'movers') {
    // Sort by absolute value of price_change_24h (descending - biggest movers first)
    cryptocurrencies.sort((a, b) => {
      const changeA = Math.abs(parseFloat(a.price_change_24h || 0));
      const changeB = Math.abs(parseFloat(b.price_change_24h || 0));
      return changeB - changeA;
    });
  }

  const handleOpenTrade = (crypto) => {
    setSelectedCrypto(crypto);
    setTradeModalOpen(true);
  };

  const handleCloseTrade = () => {
    setTradeModalOpen(false);
    setSelectedCrypto(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!cryptocurrencies || cryptocurrencies.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary">
          No cryptocurrencies available
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
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">24h Change</TableCell>
              <TableCell align="right">24h Volume</TableCell>
              <TableCell align="right">Market Cap</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cryptocurrencies.map((crypto) => (
              <TableRow key={crypto.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      src={crypto.icon_url}
                      alt={crypto.symbol}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {crypto.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {crypto.name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6" fontWeight={600}>
                    {formatCurrency(crypto.current_price)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                    {crypto.price_change_24h >= 0 ? (
                      <TrendingUpIcon color="success" fontSize="small" />
                    ) : (
                      <TrendingDownIcon color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={crypto.price_change_24h >= 0 ? 'success.main' : 'error.main'}
                    >
                      {formatPercentage(crypto.price_change_24h)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatLargeNumber(crypto.volume_24h)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={500}>
                    {formatLargeNumber(crypto.market_cap)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        setViewSelectedCrypto(crypto);
                        setViewModalOpen(true);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleOpenTrade(crypto)}
                    >
                      Trade
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
        tradeType="buy"
      />

      <ViewChartModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewSelectedCrypto(null);
        }}
        crypto={viewSelectedCrypto}
      />
    </>
  );
};

export default CryptocurrencyList;
