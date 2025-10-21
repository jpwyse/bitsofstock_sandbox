import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Grid,
  Alert,
  InputAdornment,
} from '@mui/material';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';

const TransferModal = ({ open, onClose }) => {
  const { portfolio } = usePortfolio();

  // Form state
  const [transferFrom, setTransferFrom] = useState('brokerage');
  const [transferTo, setTransferTo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [frequency, setFrequency] = useState('once');

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Get available cash
  const availableCash = portfolio?.cash_balance || 0;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setTransferFrom('brokerage');
      setTransferTo('');
      setAmount('');
      setDate(format(new Date(), 'yyyy-MM-dd')); // Default to today
      setFrequency('once');
      setShowPreview(false);
      setError(null);
      setSuccess(false);
      setValidationErrors({});
    }
  }, [open]);

  // Handle amount change with validation
  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);

      // Clear validation error for amount
      if (validationErrors.amount) {
        setValidationErrors((prev) => ({ ...prev, amount: null }));
      }
    }
  };

  // Handle transfer to change
  const handleTransferToChange = (e) => {
    setTransferTo(e.target.value);
    setError(null);

    // Clear validation error
    if (validationErrors.transferTo) {
      setValidationErrors((prev) => ({ ...prev, transferTo: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Transfer To validation
    if (!transferTo || transferTo === '') {
      errors.transferTo = 'Please select a transfer destination';
    }

    // Amount validation
    if (!amount || parseFloat(amount) <= 0) {
      errors.amount = 'Please enter an amount greater than $0';
    } else if (parseFloat(amount) > availableCash) {
      errors.amount = `Amount cannot exceed available cash (${formatCurrency(availableCash)})`;
    }

    // Date validation
    if (!date) {
      errors.date = 'Please select a date';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle preview button click
  const handlePreviewTransfer = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  // Handle back from preview
  const handleBack = () => {
    setShowPreview(false);
  };

  // Handle confirm
  const handleConfirm = () => {
    // Check if trying to use bank account placeholder
    if (transferTo === 'add_bank') {
      setError('Attach an external bank account to complete transfer.');
      return;
    }

    // Show success message
    setSuccess(true);

    // Auto-close after 1.5 seconds
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Check if submit should be disabled
  const isPreviewDisabled = !transferTo || !amount || !date || parseFloat(amount) <= 0;

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (err) {
      return dateString;
    }
  };

  // Get frequency label
  const getFrequencyLabel = (freq) => {
    const labels = {
      once: 'Once',
      weekly: 'Weekly',
      biweekly: 'Bi-Weekly',
      monthly: 'Monthly',
    };
    return labels[freq] || freq;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Tell us about your transfer</Typography>
        <Typography variant="caption" color="text.secondary">
          External transfers may take up to three business days.
        </Typography>
      </DialogTitle>

      <DialogContent>
        {!showPreview ? (
          // Form Section
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            <Grid container spacing={2}>
              {/* Transfer From */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Transfer from</InputLabel>
                  <Select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    label="Transfer from"
                  >
                    <MenuItem value="brokerage">
                      Brokerage Cash • {formatCurrency(availableCash)}
                    </MenuItem>
                  </Select>
                  <FormHelperText>
                    Available to transfer: {formatCurrency(availableCash)}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Transfer To */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!validationErrors.transferTo}>
                  <InputLabel>Transfer to</InputLabel>
                  <Select
                    value={transferTo}
                    onChange={handleTransferToChange}
                    label="Transfer to"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          minWidth: 300,
                        },
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select
                    </MenuItem>
                    <MenuItem disabled>
                      <Typography variant="caption" color="text.secondary">
                        External accounts
                      </Typography>
                    </MenuItem>
                    <MenuItem value="add_bank">Add a bank account</MenuItem>
                  </Select>
                  <FormHelperText>
                    {validationErrors.transferTo || 'Select a transfer destination'}
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>

            {/* Show bank account warning */}
            {transferTo === 'add_bank' && (
              <Alert severity="warning">
                Bank linking is not enabled in this sandbox. This is a visual placeholder.
              </Alert>
            )}

            {/* Amount */}
            <TextField
              label="Amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              error={!!validationErrors.amount}
              helperText={validationErrors.amount || `Max: ${formatCurrency(availableCash)}`}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{ maxWidth: 300 }}
            />

            <Grid container spacing={2}>
              {/* Date */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="When"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (validationErrors.date) {
                      setValidationErrors((prev) => ({ ...prev, date: null }));
                    }
                  }}
                  fullWidth
                  error={!!validationErrors.date}
                  helperText={validationErrors.date}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              {/* Frequency */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    label="Frequency"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          minWidth: 200,
                        },
                      },
                    }}
                  >
                    <MenuItem value="once">Once</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="biweekly">Bi-Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                  <FormHelperText>How often to repeat this transfer</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        ) : (
          // Preview Section
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <Typography variant="h6" gutterBottom>
              Transfer Summary
            </Typography>

            <Box p={2} bgcolor="background.default" borderRadius={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    From
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    Brokerage Cash • {formatCurrency(availableCash)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    To
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {transferTo === 'add_bank'
                      ? 'Add a bank account (not linked)'
                      : 'External Account'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(parseFloat(amount || 0))}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    When
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatDisplayDate(date)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Frequency
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {getFrequencyLabel(frequency)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert severity="success">Transfer scheduled (placeholder).</Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!showPreview ? (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              onClick={handlePreviewTransfer}
              variant="contained"
              color="primary"
              disabled={isPreviewDisabled}
            >
              Preview transfer
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleBack} disabled={success}>
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              color="primary"
              disabled={success}
            >
              Confirm
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransferModal;
