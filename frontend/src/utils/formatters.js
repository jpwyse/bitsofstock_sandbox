// Utility functions for formatting values

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
