// Utility functions for calculations

export const calculateGainLoss = (currentValue, costBasis) => {
  if (!costBasis || costBasis === 0) return 0;
  return currentValue - costBasis;
};

export const calculateGainLossPercentage = (currentValue, costBasis) => {
  if (!costBasis || costBasis === 0) return 0;
  return ((currentValue - costBasis) / costBasis) * 100;
};

export const calculateAllocation = (holdingValue, totalPortfolioValue) => {
  if (!totalPortfolioValue || totalPortfolioValue === 0) return 0;
  return (holdingValue / totalPortfolioValue) * 100;
};

export const calculateAveragePrice = (totalCost, quantity) => {
  if (!quantity || quantity === 0) return 0;
  return totalCost / quantity;
};

export const calculateTradeAmount = (price, quantity) => {
  return price * quantity;
};

export const calculateQuantityFromAmount = (amount, price) => {
  if (!price || price === 0) return 0;
  return amount / price;
};

export const isPositive = (value) => {
  return value > 0;
};

export const isNegative = (value) => {
  return value < 0;
};
