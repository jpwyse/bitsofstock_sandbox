/**
 * Formatting Utilities - Display Formatting for Currency, Numbers, Dates, and Percentages
 *
 * Collection of pure utility functions for consistent data formatting across the application.
 * Uses Intl.NumberFormat and Intl.DateTimeFormat for locale-aware formatting. All functions
 * handle null/undefined gracefully and accept string or numeric inputs.
 *
 * **Currency Formatters:**
 * - formatCurrency(value, decimals=2): USD currency with customizable decimals
 *   • Default: $1,234.56 (2 decimals)
 *   • Examples: formatCurrency(1234.56) → "$1,234.56", formatCurrency(0.123, 4) → "$0.1230"
 *   • Null safe: Returns "$0.00" for null/undefined
 *
 * - formatCurrencyWithSign(value, decimals=2): USD currency with +/- sign prefix
 *   • Positive: +$123.45
 *   • Negative: -$123.45
 *   • Zero: $0.00 (no sign)
 *   • Use case: Gain/loss display where sign is important
 *
 * - formatLargeNumber(value): Abbreviated large numbers with K/M/B/T suffixes
 *   • Examples: $1.23K, $45.67M, $8.90B, $12.34T
 *   • Breakpoints: >= 1e3 (K), >= 1e6 (M), >= 1e9 (B), >= 1e12 (T)
 *   • < 1000: Falls back to formatCurrency(value, 0) (no decimals)
 *   • Use case: Market cap, volume display in tables/charts
 *
 * **Number Formatters:**
 * - formatNumber(value, decimals=2): Plain number with thousand separators
 *   • Example: formatNumber(1234.567, 2) → "1,234.57"
 *   • No currency symbol, just comma-separated digits
 *
 * - formatCryptoQuantity(value, decimals=8): Crypto quantity with trailing zeros removed
 *   • Default: 8 decimals (standard crypto precision)
 *   • Examples: formatCryptoQuantity(1.50000000) → "1.5", formatCryptoQuantity(0.00012345) → "0.00012345"
 *   • Trailing zeros stripped via parseFloat().toString()
 *   • Use case: Displaying BTC/ETH quantities (avoid unnecessary zeros)
 *
 * **Percentage Formatters:**
 * - formatPercentage(value, decimals=2): Percentage with +/- sign
 *   • Examples: formatPercentage(12.34) → "+12.34%", formatPercentage(-5.67) → "-5.67%"
 *   • Always shows sign for positive values (+ prefix)
 *   • Use case: 24h price change, portfolio gain/loss percentage
 *
 * **Date/Time Formatters:**
 * - formatDate(dateString): Full date with time (US locale)
 *   • Format: "Jan 15, 2025, 02:30 PM"
 *   • Components: month (short), day, year, hour (12h), minute
 *   • Input: ISO 8601 string or any parseable date string
 *
 * - formatShortDate(dateString): Short date without time
 *   • Format: "Jan 15"
 *   • Components: month (short), day
 *   • Use case: Chart x-axis labels, compact date display
 *
 * - formatRelativeTime(dateString): Relative time ("2h ago", "Just now")
 *   • < 60 seconds: "Just now"
 *   • < 60 minutes: "{minutes}m ago"
 *   • < 24 hours: "{hours}h ago"
 *   • < 7 days: "{days}d ago"
 *   • >= 7 days: Falls back to formatDate() (full date/time)
 *   • Use case: Transaction timestamps, news article dates
 *
 * **Input Handling:**
 * - All functions accept string | number | null | undefined
 * - String inputs: Parsed via parseFloat() before formatting
 * - Null/undefined: Return safe defaults ("$0.00", "0", "0.00%", "" for dates)
 * - Invalid dates: Return empty string ("")
 *
 * **Intl.NumberFormat Usage:**
 * - Locale: 'en-US' (US English with comma thousand separators)
 * - Currency: 'USD' (dollar sign, 2 decimals default)
 * - Customizable decimals via minimumFractionDigits/maximumFractionDigits
 *
 * **Intl.DateTimeFormat Usage:**
 * - Locale: 'en-US' (US English date format)
 * - Options: month (short/numeric), day (numeric), year (numeric), hour/minute (for full dates)
 *
 * **Common Use Cases by Component:**
 * - Portfolio.js: formatCurrency (portfolio value), formatPercentage (gain/loss %)
 * - CryptocurrencyList.js: formatCurrency (price), formatLargeNumber (volume, market cap)
 * - TransactionsList.js: formatCurrency (amount), formatDate (timestamp)
 * - HoldingsList.js: formatCryptoQuantity (quantity), formatCurrency (cost basis)
 * - TradeModal.js: formatCurrency (available cash, total value)
 * - Account.js: formatDate (date of birth via date-fns, not these utils)
 *
 * **Performance:**
 * - Pure functions (no side effects)
 * - Intl.* APIs cached by browser (performant repeated calls)
 * - No external dependencies (built-in JavaScript APIs)
 *
 * **Testing:**
 * - Null safety: All functions handle null/undefined without errors
 * - Type coercion: String inputs converted via parseFloat()
 * - Edge cases: Zero, negative, very large, very small numbers
 *
 * @module formatters
 * @example
 * import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters';
 *
 * formatCurrency(1234.56);        // "$1,234.56"
 * formatPercentage(12.34);        // "+12.34%"
 * formatLargeNumber(1234567890);  // "$1.23B"
 * formatDate('2025-01-15T14:30:00Z'); // "Jan 15, 2025, 02:30 PM"
 * formatRelativeTime('2025-01-15T12:00:00Z'); // "2h ago" (if now is 14:00)
 */

/**
 * Format value as USD currency
 *
 * @param {number|string|null|undefined} value - Numeric value to format
 * @param {number} decimals - Number of decimal places (default 2)
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined) return '$0.00';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
};

export const formatCurrencyWithSign = (value, decimals = 2) => {
  if (value === null || value === undefined) return '$0.00';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = formatCurrency(Math.abs(numValue), decimals);

  if (numValue > 0) return `+${formatted}`;
  if (numValue < 0) return `-${formatted}`;
  return formatted;
};

export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0.00%';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(decimals)}%`;
};

export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
};

export const formatCryptoQuantity = (value, decimals = 8) => {
  if (value === null || value === undefined) return '0';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Remove trailing zeros
  return parseFloat(numValue.toFixed(decimals)).toString();
};

export const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatShortDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(dateString);
};

export const formatLargeNumber = (value) => {
  if (value === null || value === undefined) return '$0';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (numValue >= 1e12) {
    return `$${(numValue / 1e12).toFixed(2)}T`;
  } else if (numValue >= 1e9) {
    return `$${(numValue / 1e9).toFixed(2)}B`;
  } else if (numValue >= 1e6) {
    return `$${(numValue / 1e6).toFixed(2)}M`;
  } else if (numValue >= 1e3) {
    return `$${(numValue / 1e3).toFixed(2)}K`;
  }

  return formatCurrency(numValue, 0);
};
