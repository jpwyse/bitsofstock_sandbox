/**
 * Trade Modal Component - Buy/Sell Cryptocurrency Trading Interface
 *
 * Comprehensive trading modal with cryptocurrency selection, buy/sell toggle, dual input
 * modes (USD amount or quantity), auto-calculation, validation, and real-time feedback.
 * Integrates with PortfolioContext for trade execution and portfolio updates.
 *
 * Features:
 * - Trade Type Toggle: Buy (primary color) vs Sell (error/red color)
 * - Cryptocurrency Selection: Autocomplete search with symbol/name filtering
 * - Dual Input Modes:
 *   • USD Amount: Enter dollar amount, quantity auto-calculated
 *   • Quantity: Enter crypto quantity, USD amount auto-calculated
 * - Real-time Calculation: Updates opposite field based on current price
 * - Validation:
 *   • Cryptocurrency must be selected
 *   • Either USD amount OR quantity required (not both zero, not both empty)
 *   • Numeric validation (no negative, no invalid characters)
 *   • Buy: Cash balance check (backend validates sufficient funds)
 *   • Sell: Holdings check (backend validates sufficient quantity)
 * - Success/Error States: Alert banners with auto-close on success (1.5s delay)
 * - Loading States: Spinner for crypto list fetch and trade submission
 *
 * Props:
 * @param {boolean} open - Controls modal visibility (Dialog open state)
 * @param {function} onClose - Callback to close modal (triggered on cancel or success)
 *
 * State Management:
 * - cryptocurrencies: Array of available cryptos from /api/cryptocurrencies
 * - selectedCrypto: Currently selected cryptocurrency object (from autocomplete)
 * - loadingCryptos: Loading state for cryptocurrency list fetch
 * - tradeType: 'buy' or 'sell' (ToggleButtonGroup)
 * - inputMode: 'usd' or 'quantity' (determines which field drives calculation)
 * - usdAmount: USD dollar amount string (validated regex: /^\d*\.?\d*$/)
 * - quantity: Crypto quantity string (validated regex: /^\d*\.?\d*$/)
 * - loading: Trade submission loading state
 * - error: Error message string (displayed in Alert)
 * - success: Success boolean (triggers success Alert and auto-close)
 *
 * Auto-Calculation Logic:
 * - inputMode='usd' + usdAmount changed → quantity = usdAmount / current_price
 * - inputMode='quantity' + quantity changed → usdAmount = quantity * current_price
 * - Recalculates when selectedCrypto changes (price update)
 * - Updates toString() for display (no rounding, shows full precision)
 *
 * Data Sources:
 * - /api/cryptocurrencies: List of available cryptos (fetched on modal open)
 * - PortfolioContext:
 *   • executeBuy(crypto_id, usd_amount, quantity) → Calls /api/trades/buy
 *   • executeSell(crypto_id, usd_amount, quantity) → Calls /api/trades/sell
 *   • portfolio.cash_balance: Displayed in USD amount helper text
 *
 * Form Reset Behavior:
 * - On modal open (useEffect[open]):
 *   • Clears selectedCrypto, usdAmount, quantity
 *   • Resets error, success states
 *   • Sets tradeType='buy', inputMode='usd'
 * - Preserves state during submission (only resets on success or modal re-open)
 *
 * Validation Rules:
 * - Cryptocurrency required: Error "Please select a cryptocurrency"
 * - Amount/quantity required: Error "Please enter an amount or quantity"
 * - Numeric input only: Regex /^\d*\.?\d*$/ (digits, optional single decimal point)
 * - Positive values: Submit disabled if <= 0
 * - Backend validates:
 *   • Buy: Sufficient cash_balance >= amount_usd
 *   • Sell: Sufficient holdings quantity >= quantity
 *
 * Submit Button States:
 * - Disabled when:
 *   • loading=true (trade in progress)
 *   • !selectedCrypto (no crypto selected)
 *   • !usdAmount && !quantity (both empty)
 *   • NaN or <= 0 (invalid numeric value)
 * - Button text:
 *   • No crypto selected: "Select Cryptocurrency"
 *   • Crypto selected: "Buy {SYMBOL}" or "Sell {SYMBOL}"
 *   • Loading: CircularProgress spinner
 * - Button color: Primary (buy) or Error/red (sell)
 *
 * Success Flow:
 * - executeBuy/executeSell returns { success: true, transaction, updated_portfolio }
 * - setSuccess(true) → Success Alert displayed
 * - setTimeout(1500ms) → onClose() auto-closes modal
 * - PortfolioContext auto-refreshes portfolio data (triggers global state update)
 *
 * Error Handling:
 * - Crypto fetch error: Sets error state "Failed to load cryptocurrencies"
 * - Trade error: Displays backend error message (e.g., "Insufficient funds")
 * - Network error: Displays err.message or generic "An error occurred"
 * - Alert dismissible via X button (onClose={() => setError(null)})
 *
 * Autocomplete Behavior:
 * - Options: cryptocurrencies array (symbol, name, icon_url, current_price)
 * - Search: Filters by symbol OR name (case-insensitive includes)
 * - Display: "{SYMBOL} - {Name}" label
 * - Dropdown options: Avatar icon + Symbol (bold) + Name (secondary color)
 * - Loading state: Shows spinner while loadingCryptos=true
 * - Disabled: While loading cryptos
 *
 * Input Mode Toggle:
 * - USD Amount: Focuses USD input field, auto-calculates quantity
 * - Quantity: Focuses quantity input field, auto-calculates USD amount
 * - Disabled until cryptocurrency selected
 * - Size: small (compact buttons)
 * - Full width for visual consistency
 *
 * Display Elements:
 * - Dialog Title:
 *   • Selected: Avatar + Name + Symbol + Current Price
 *   • Unselected: Avatar placeholder "T" + "Trade"
 * - Helper Texts:
 *   • USD Amount: "Available: ${cash_balance}"
 *   • Autocomplete: "Select a cryptocurrency to trade" (if none selected)
 * - Total Value Box: Shows quantity × current_price (only when quantity > 0)
 *
 * Color Semantics:
 * - Buy: Primary color (blue/purple)
 * - Sell: Error color (red)
 * - Success: Green Alert
 * - Error: Red Alert
 *
 * Responsive Design:
 * - maxWidth="sm" (600px max width on desktop)
 * - fullWidth on mobile
 * - Dialog content scrollable if overflows
 *
 * Performance Considerations:
 * - Cryptocurrency list fetched once per modal open (not on every render)
 * - Auto-calculation debounced via inputMode tracking (prevents infinite loops)
 * - Form state preserved during submission (no re-renders)
 *
 * Related Components:
 * - PortfolioContext: Trade execution and portfolio refresh
 * - apiService: API client for /api/cryptocurrencies
 * - formatCurrency: USD formatting utility
 *
 * Backend Integration:
 * - POST /api/trades/buy: BuyRequestSchema { cryptocurrency_id, amount_usd?, quantity? }
 * - POST /api/trades/sell: SellRequestSchema { cryptocurrency_id, amount_usd?, quantity? }
 * - See trading/api.py:execute_buy and trading/api.py:execute_sell
 *
 * @component
 * @example
 * // Used in Market.js CryptocurrencyList
 * const [tradeModalOpen, setTradeModalOpen] = useState(false);
 * <TradeModalAllCryptos
 *   open={tradeModalOpen}
 *   onClose={() => setTradeModalOpen(false)}
 * />
 */
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
import apiService from '../services/apiAxios';

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
