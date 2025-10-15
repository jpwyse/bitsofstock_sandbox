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
} from '@mui/material';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatCryptoQuantity } from '../utils/formatters';

const TradeModal = ({ open, onClose, cryptocurrency, tradeType: initialTradeType = 'buy' }) => {
  const { executeBuy, executeSell, portfolio } = usePortfolio();
  const [tradeType, setTradeType] = useState(initialTradeType);
  const [inputMode, setInputMode] = useState('usd'); // 'usd' or 'quantity'
  const [usdAmount, setUsdAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setTradeType(initialTradeType);
  }, [initialTradeType]);

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setUsdAmount('');
      setQuantity('');
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    // Auto-calculate the other field when one changes
    if (!cryptocurrency?.current_price) return;

    if (inputMode === 'usd' && usdAmount) {
      const calc = parseFloat(usdAmount) / parseFloat(cryptocurrency.current_price);
      setQuantity(calc.toString());
    } else if (inputMode === 'quantity' && quantity) {
      const calc = parseFloat(quantity) * parseFloat(cryptocurrency.current_price);
      setUsdAmount(calc.toString());
    }
  }, [usdAmount, quantity, inputMode, cryptocurrency]);

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
        result = await executeBuy(cryptocurrency.id, usdValue, quantityValue);
      } else {
        result = await executeSell(cryptocurrency.id, usdValue, quantityValue);
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

  if (!cryptocurrency) return null;

  const currentPrice = parseFloat(cryptocurrency.current_price || 0);
  const totalValue = quantity ? parseFloat(quantity) * currentPrice : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={cryptocurrency.icon_url} alt={cryptocurrency.symbol} />
          <Box>
            <Typography variant="h6">{cryptocurrency.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {cryptocurrency.symbol} • {formatCurrency(currentPrice)}
            </Typography>
          </Box>
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

          {/* Input Mode Toggle */}
          <ToggleButtonGroup
            value={inputMode}
            exclusive
            onChange={handleInputModeChange}
            fullWidth
            size="small"
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
            InputProps={{
              endAdornment: <Typography sx={{ ml: 1 }}>{cryptocurrency.symbol}</Typography>,
            }}
          />

          {/* Total Value Display */}
          {quantity && (
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
          disabled={loading || !usdAmount || !quantity}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${cryptocurrency.symbol}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TradeModal;
