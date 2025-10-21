import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/formatters';
import apiService from '../services/api';

const TradeModalAllCryptos = ({ open, onClose }) => {
  const { executeBuy, executeSell, portfolio } = usePortfolio();

  // Cryptocurrency list and selection
  const [cryptocurrencies, setCryptocurrencies] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [loadingCryptos, setLoadingCryptos] = useState(false);

  // Trade state
  const [tradeType, setTradeType] = useState('buy');
  const [inputMode, setInputMode] = useState('usd'); // 'usd' or 'quantity'
  const [usdAmount, setUsdAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch cryptocurrencies when modal opens
  useEffect(() => {
    const fetchCryptocurrencies = async () => {
      if (!open) return;

      setLoadingCryptos(true);
      try {
        const data = await apiService.getCryptocurrencies();
        setCryptocurrencies(data);
      } catch (err) {
        console.error('Error fetching cryptocurrencies:', err);
        setError('Failed to load cryptocurrencies');
      } finally {
        setLoadingCryptos(false);
      }
    };

    fetchCryptocurrencies();
  }, [open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCrypto(null);
      setUsdAmount('');
      setQuantity('');
      setError(null);
      setSuccess(false);
      setTradeType('buy');
      setInputMode('usd');
    }
  }, [open]);

  // Auto-calculate the other field when one changes
  useEffect(() => {
    if (!selectedCrypto?.current_price) return;

    if (inputMode === 'usd' && usdAmount) {
      const calc = parseFloat(usdAmount) / parseFloat(selectedCrypto.current_price);
      setQuantity(calc.toString());
    } else if (inputMode === 'quantity' && quantity) {
      const calc = parseFloat(quantity) * parseFloat(selectedCrypto.current_price);
      setUsdAmount(calc.toString());
    }
  }, [usdAmount, quantity, inputMode, selectedCrypto]);

  // Recalculate when selected crypto changes
  useEffect(() => {
    if (!selectedCrypto?.current_price) return;

    if (inputMode === 'usd' && usdAmount) {
      const calc = parseFloat(usdAmount) / parseFloat(selectedCrypto.current_price);
      setQuantity(calc.toString());
    } else if (inputMode === 'quantity' && quantity) {
      const calc = parseFloat(quantity) * parseFloat(selectedCrypto.current_price);
      setUsdAmount(calc.toString());
    }
  }, [selectedCrypto]);

  const handleTradeTypeChange = (event, newType) => {
    if (newType !== null) {
      setTradeType(newType);
      setError(null);
    }
  };

  const handleInputModeChange = (event, newMode) => {
    if (newMode !== null) {
      setInputMode(newMode);
    }
  };

  const handleUsdChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setUsdAmount(value);
      setInputMode('usd');
      setError(null);
    }
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setQuantity(value);
      setInputMode('quantity');
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCrypto) {
      setError('Please select a cryptocurrency');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usdValue = usdAmount ? parseFloat(usdAmount) : null;
      const quantityValue = quantity ? parseFloat(quantity) : null;

      if (!usdValue && !quantityValue) {
        setError('Please enter an amount or quantity');
        setLoading(false);
        return;
      }

      let result;
      if (tradeType === 'buy') {
        result = await executeBuy(selectedCrypto.id, usdValue, quantityValue);
      } else {
        result = await executeSell(selectedCrypto.id, usdValue, quantityValue);
      }

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Trade failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const currentPrice = selectedCrypto ? parseFloat(selectedCrypto.current_price || 0) : 0;
  const totalValue = quantity && selectedCrypto ? parseFloat(quantity) * currentPrice : 0;

  // Check if submit should be disabled
  const isSubmitDisabled =
    loading ||
    !selectedCrypto ||
    (!usdAmount && !quantity) ||
    isNaN(parseFloat(usdAmount || quantity)) ||
    parseFloat(usdAmount || quantity) <= 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          {selectedCrypto ? (
            <>
              <Avatar src={selectedCrypto.icon_url} alt={selectedCrypto.symbol} />
              <Box>
                <Typography variant="h6">{selectedCrypto.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCrypto.symbol} • {formatCurrency(currentPrice)}
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Avatar sx={{ bgcolor: 'grey.400' }}>T</Avatar>
              <Typography variant="h6">Trade</Typography>
            </>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} mt={2}>
          {/* Trade Type Toggle */}
          <ToggleButtonGroup
            value={tradeType}
            exclusive
            onChange={handleTradeTypeChange}
            fullWidth
          >
            <ToggleButton value="buy" color="primary">
              Buy
            </ToggleButton>
            <ToggleButton value="sell" color="error">
              Sell
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Cryptocurrency Autocomplete */}
          <Autocomplete
            options={cryptocurrencies}
            value={selectedCrypto}
            onChange={(event, newValue) => {
              setSelectedCrypto(newValue);
              setError(null);
            }}
            getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
            renderOption={(props, option) => (
              <Box component="li" {...props} display="flex" alignItems="center" gap={1}>
                <Avatar src={option.icon_url} alt={option.symbol} sx={{ width: 24, height: 24 }} />
                <Typography variant="body2" fontWeight={600}>
                  {option.symbol}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {option.name}
                </Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Cryptocurrency"
                placeholder="Type to search..."
                helperText={!selectedCrypto ? "Select a cryptocurrency to trade" : ""}
              />
            )}
            loading={loadingCryptos}
            disabled={loadingCryptos}
            filterOptions={(options, { inputValue }) => {
              const searchTerm = inputValue.toLowerCase();
              return options.filter(
                (option) =>
                  option.symbol.toLowerCase().includes(searchTerm) ||
                  option.name.toLowerCase().includes(searchTerm)
              );
            }}
          />

          {/* Input Mode Toggle */}
          <ToggleButtonGroup
            value={inputMode}
            exclusive
            onChange={handleInputModeChange}
            fullWidth
            size="small"
            disabled={!selectedCrypto}
          >
            <ToggleButton value="usd">USD Amount</ToggleButton>
            <ToggleButton value="quantity">Quantity</ToggleButton>
          </ToggleButtonGroup>

          {/* USD Amount Input */}
          <TextField
            label="USD Amount"
            type="text"
            value={usdAmount}
            onChange={handleUsdChange}
            fullWidth
            disabled={!selectedCrypto}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            helperText={`Available: ${formatCurrency(portfolio?.cash_balance || 0)}`}
          />

          {/* Quantity Input */}
          <TextField
            label="Quantity"
            type="text"
            value={quantity}
            onChange={handleQuantityChange}
            fullWidth
            disabled={!selectedCrypto}
            InputProps={{
              endAdornment: (
                <Typography sx={{ ml: 1 }}>
                  {selectedCrypto?.symbol || ''}
                </Typography>
              ),
            }}
          />

          {/* Total Value Display */}
          {quantity && selectedCrypto && (
            <Box p={2} bgcolor="background.default" borderRadius={2}>
              <Typography variant="body2" color="text.secondary">
                Total Value
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {formatCurrency(totalValue)}
              </Typography>
            </Box>
          )}

          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert severity="success">
              {tradeType === 'buy' ? 'Purchase' : 'Sale'} successful!
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={tradeType === 'buy' ? 'primary' : 'error'}
          disabled={isSubmitDisabled}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : selectedCrypto ? (
            `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedCrypto.symbol}`
          ) : (
            'Select Cryptocurrency'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TradeModalAllCryptos;
