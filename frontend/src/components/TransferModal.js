/**
 * Transfer Modal Component - Cash Transfer Placeholder Interface
 *
 * Non-functional transfer modal for scheduling cash transfers between brokerage account
 * and external bank accounts. **Placeholder UI only** - does NOT execute actual transfers,
 * mutate portfolio cash balance, or persist data. Demonstrates UI flow for external account
 * linking and transfer scheduling.
 *
 * **IMPORTANT: Sandbox Placeholder**
 * - No backend API integration (no /api/transfers endpoint)
 * - No portfolio cash_balance changes (non-mutating)
 * - No bank account linking (placeholder "Add a bank account" option)
 * - Displays warning: "Attach an external bank account to complete transfer"
 * - Success Alert: "Transfer scheduled (placeholder)" - no actual scheduling
 * - Auto-closes on "Confirm" with 1.5s delay (simulates success flow)
 *
 * Features:
 * - Two-Step Flow:
 *   1. Form: Transfer from/to, amount, date, frequency
 *   2. Preview: Summary review with confirm/back buttons
 * - Transfer From: Brokerage Cash (fixed, shows available balance)
 * - Transfer To: External accounts dropdown (placeholder "Add a bank account")
 * - Amount Validation:
 *   • Required, > $0
 *   • Cannot exceed available cash balance
 *   • Numeric input only (regex: /^\d*\.?\d*$/)
 * - Date Selection: Date picker with default=today, required
 * - Frequency: Once, Weekly, Bi-Weekly, Monthly (visual only, no recurrence logic)
 * - Validation: Real-time error messages, disabled submit until valid
 *
 * Props:
 * @param {boolean} open - Controls modal visibility (Dialog open state)
 * @param {function} onClose - Callback to close modal (triggered on cancel or success)
 *
 * State Management:
 * - transferFrom: 'brokerage' (hardcoded, only option)
 * - transferTo: '' | 'add_bank' (selected destination, validated required)
 * - amount: String (USD amount, validated > 0 and <= availableCash)
 * - date: String (YYYY-MM-DD format, default today, required)
 * - frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' (visual only)
 * - showPreview: Boolean (toggles between form and preview views)
 * - error: String (error message for bank account placeholder)
 * - success: Boolean (triggers success Alert and auto-close)
 * - validationErrors: Object { transferTo, amount, date } (field-specific errors)
 *
 * Validation Rules:
 * - transferTo: Required, error "Please select a transfer destination"
 * - amount: Required, > 0, <= availableCash
 *   • Error: "Please enter an amount greater than $0"
 *   • Error: "Amount cannot exceed available cash (${availableCash})"
 * - date: Required, error "Please select a date"
 * - Preview button disabled until all valid (isPreviewDisabled check)
 *
 * Form Reset Behavior:
 * - On modal open (useEffect[open]):
 *   • Sets transferFrom='brokerage'
 *   • Clears transferTo, amount
 *   • Sets date=today (format(new Date(), 'yyyy-MM-dd'))
 *   • Sets frequency='once'
 *   • Resets showPreview=false, error=null, success=false, validationErrors={}
 *
 * Bank Account Placeholder Logic:
 * - transferTo='add_bank' option shows warning Alert:
 *   "Bank linking is not enabled in this sandbox. This is a visual placeholder."
 * - On confirm with 'add_bank':
 *   • Sets error: "Attach an external bank account to complete transfer."
 *   • Does NOT proceed (no success state, no auto-close)
 * - Demonstrates UX pattern for missing external account linkage
 *
 * Preview Section:
 * - Transfer Summary: Read-only review of form inputs
 * - Displays:
 *   • From: "Brokerage Cash • ${availableCash}"
 *   • To: "Add a bank account (not linked)" or "External Account"
 *   • Amount: Formatted currency
 *   • When: Human-readable date (MMMM d, yyyy via date-fns)
 *   • Frequency: Label (Once/Weekly/Bi-Weekly/Monthly)
 * - Back button: Returns to form (setShowPreview(false))
 * - Confirm button: Triggers handleConfirm() flow
 *
 * Success Flow (Placeholder):
 * - setSuccess(true) → Success Alert "Transfer scheduled (placeholder)."
 * - setTimeout(1500ms) → onClose() auto-closes modal
 * - NO portfolio updates (cash_balance unchanged)
 * - NO backend API call
 * - NO persistent data (state cleared on next open)
 *
 * Data Sources:
 * - PortfolioContext: portfolio.cash_balance for "Available to transfer" display
 * - No external API calls (placeholder modal)
 *
 * Input Validation:
 * - Amount: Regex /^\d*\.?\d*$/ (digits, optional decimal, no negatives)
 * - Real-time validation error clearing on input change
 * - Form-wide validation on "Preview transfer" button click
 * - Field-specific errors displayed in helperText (red text)
 *
 * Display Elements:
 * - Dialog Title: "Tell us about your transfer" + caption about 3-day processing
 * - Form Grid Layout: 2-column on desktop (md+), 1-column on mobile
 * - Helper Texts:
 *   • Transfer From: "Available to transfer: ${availableCash}"
 *   • Transfer To: "Select a transfer destination" or error message
 *   • Amount: "Max: ${availableCash}" or error message
 *   • Frequency: "How often to repeat this transfer"
 * - Preview Background: background.default color (light gray)
 *
 * Button States:
 * - Form View:
 *   • Cancel: Always enabled, calls onClose()
 *   • Preview transfer: Disabled if !transferTo || !amount || !date || amount <= 0
 * - Preview View:
 *   • Back: Disabled if success=true (after confirm)
 *   • Confirm: Disabled if success=true, primary color
 *
 * Color Semantics:
 * - Warning Alert: Yellow/orange (bank account placeholder warning)
 * - Error Alert: Red (bank account error message)
 * - Success Alert: Green (transfer scheduled placeholder)
 *
 * Date Formatting:
 * - Input: YYYY-MM-DD (HTML date input format)
 * - Display: MMMM d, yyyy (e.g., "January 15, 2025" via date-fns format)
 * - Default: Today's date (format(new Date(), 'yyyy-MM-dd'))
 *
 * Responsive Design:
 * - maxWidth="sm" (600px max width on desktop)
 * - fullWidth on mobile
 * - Grid responsive: xs=12 (full width), md=6 (half width)
 * - Amount TextField: maxWidth=300px (constrained for visual design)
 *
 * Performance Considerations:
 * - No network requests (fully client-side placeholder)
 * - Form state reset on modal open (useEffect[open])
 * - Validation only runs on preview click (not every keystroke)
 *
 * UX Notes:
 * - External transfer disclaimer: "may take up to three business days"
 * - Clear visual distinction: Warning for placeholder, Success for completion
 * - Auto-close on success prevents confusion (no manual dismiss needed)
 * - Back button allows editing without re-entering all fields
 *
 * Related Components:
 * - PortfolioContext: Cash balance display only (no mutations)
 * - formatCurrency: USD formatting utility
 * - date-fns: Date parsing and formatting
 *
 * Production Implementation Notes (Not Implemented):
 * - Backend endpoint: POST /api/transfers (create transfer request)
 * - Bank linking: OAuth integration (Plaid, Yodlee, etc.)
 * - Recurring transfers: Cron job or scheduled task processing
 * - Transaction history: Transfer records in database
 * - Email notifications: Transfer confirmation and completion
 * - ACH processing: 1-3 business day settlement tracking
 *
 * @component
 * @example
 * // Opened from Portfolio.js or Account.js
 * const [transferModalOpen, setTransferModalOpen] = useState(false);
 * <TransferModal
 *   open={transferModalOpen}
 *   onClose={() => setTransferModalOpen(false)}
 * />
 */
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
