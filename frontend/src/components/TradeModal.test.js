/**
 * Tests for TradeModal component.
 *
 * This component handles buy/sell cryptocurrency trading with input validation
 * and dual input modes (USD amount or quantity).
 *
 * Key Test Coverage:
 * - Rendering: Modal display, crypto info, input fields
 * - Trade Types: Buy/Sell toggle functionality
 * - Input Modes: USD amount vs. quantity switching
 * - Calculations: Auto-calculate between USD and quantity
 * - Validation: Empty inputs, error handling
 * - API Integration: executeBuy/executeSell calls
 * - Success/Error States: Alert display, modal close
 *
 * Component Behaviors Tested:
 * - Modal opens/closes correctly
 * - Trade type toggles between buy and sell
 * - Input mode toggles between USD and quantity
 * - Quantity auto-calculated from USD input
 * - USD auto-calculated from quantity input
 * - Form validation prevents empty submissions
 * - Success closes modal after delay
 * - Errors displayed in alert
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '../utils/testUtils';
import TradeModal from './TradeModal';
import * as PortfolioContext from '../context/PortfolioContext';

// Mock PortfolioContext
jest.mock('../context/PortfolioContext', () => ({
  usePortfolio: jest.fn(),
}));

describe('TradeModal', () => {
  const mockCryptocurrency = {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    icon_url: 'https://example.com/btc.png',
    current_price: '50000.00',
  };

  const mockPortfolioContextValue = {
    portfolio: {
      cash_balance: '10000.00',
    },
    executeBuy: jest.fn().mockResolvedValue({ success: true }),
    executeSell: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    PortfolioContext.usePortfolio.mockReturnValue(mockPortfolioContextValue);
  });

  it('renders modal when open', () => {
    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText(/BTC/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithTheme(
      <TradeModal
        open={false}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    expect(screen.queryByText('Bitcoin')).not.toBeInTheDocument();
  });

  it('returns null when cryptocurrency is undefined', () => {
    const { container } = renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={undefined}
        tradeType="buy"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays current cryptocurrency price', () => {
    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    expect(screen.getByText(/\$50,000\.00/)).toBeInTheDocument();
  });

  it('displays available cash balance', () => {
    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    expect(screen.getByText(/Available: \$10,000\.00/)).toBeInTheDocument();
  });

  it('toggles between buy and sell trade types', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const sellButton = screen.getByRole('button', { name: /Sell/i });
    await user.click(sellButton);

    // Submit button should show "Sell"
    expect(screen.getByRole('button', { name: /Sell BTC/i })).toBeInTheDocument();
  });

  it('toggles between USD and quantity input modes', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const quantityModeButton = screen.getByRole('button', { name: /Quantity/i });
    await user.click(quantityModeButton);

    // Both input fields should still be visible
    expect(screen.getByLabelText(/USD Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
  });

  it('auto-calculates quantity when USD amount entered', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, '5000');

    // Should auto-calculate quantity: 5000 / 50000 = 0.1
    const quantityInput = screen.getByLabelText(/Quantity/i);
    await waitFor(() => {
      expect(quantityInput).toHaveValue('0.1');
    });
  });

  it('auto-calculates USD when quantity entered', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const quantityInput = screen.getByLabelText(/Quantity/i);
    await user.type(quantityInput, '0.5');

    // Should auto-calculate USD: 0.5 * 50000 = 25000
    const usdInput = screen.getByLabelText(/USD Amount/i);
    await waitFor(() => {
      expect(usdInput).toHaveValue('25000');
    });
  });

  it('displays total value when quantity entered', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const quantityInput = screen.getByLabelText(/Quantity/i);
    await user.type(quantityInput, '0.5');

    await waitFor(() => {
      expect(screen.getByText('Total Value')).toBeInTheDocument();
      expect(screen.getByText(/\$25,000\.00/)).toBeInTheDocument();
    });
  });

  it('submit button is disabled when no amount entered', () => {
    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const submitButton = screen.getByRole('button', { name: /Buy BTC/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls executeBuy when buy trade submitted', async () => {
    const user = userEvent.setup();
    const mockExecuteBuy = jest.fn().mockResolvedValue({ success: true });

    PortfolioContext.usePortfolio.mockReturnValue({
      ...mockPortfolioContextValue,
      executeBuy: mockExecuteBuy,
    });

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, '5000');

    const submitButton = screen.getByRole('button', { name: /Buy BTC/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockExecuteBuy).toHaveBeenCalledWith('btc', 5000, expect.any(Number));
    });
  });

  it('calls executeSell when sell trade submitted', async () => {
    const user = userEvent.setup();
    const mockExecuteSell = jest.fn().mockResolvedValue({ success: true });

    PortfolioContext.usePortfolio.mockReturnValue({
      ...mockPortfolioContextValue,
      executeSell: mockExecuteSell,
    });

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="sell"
      />
    );

    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, '5000');

    const submitButton = screen.getByRole('button', { name: /Sell BTC/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockExecuteSell).toHaveBeenCalledWith('btc', 5000, expect.any(Number));
    });
  });

  it('displays success message after successful trade', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, '5000');

    const submitButton = screen.getByRole('button', { name: /Buy BTC/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Purchase successful!/i)).toBeInTheDocument();
    });
  });

  it('displays error message when trade fails', async () => {
    const user = userEvent.setup();
    const mockExecuteBuy = jest.fn().mockResolvedValue({
      success: false,
      error: 'Insufficient funds',
    });

    PortfolioContext.usePortfolio.mockReturnValue({
      ...mockPortfolioContextValue,
      executeBuy: mockExecuteBuy,
    });

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, '5000');

    const submitButton = screen.getByRole('button', { name: /Buy BTC/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
    });
  });

  it('closes modal after successful trade delay', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const mockOnClose = jest.fn();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={mockOnClose}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, '5000');

    const submitButton = screen.getByRole('button', { name: /Buy BTC/i });
    await user.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText(/Purchase successful!/i)).toBeInTheDocument();
    });

    // Fast-forward timers
    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={mockOnClose}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form when modal reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    // Enter values
    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, '5000');

    // Close modal
    rerender(
      <TradeModal
        open={false}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    // Reopen modal
    rerender(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    // Inputs should be reset
    const usdInputAfterReopen = screen.getByLabelText(/USD Amount/i);
    expect(usdInputAfterReopen).toHaveValue('');
  });

  it('only allows numeric input in USD field', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, 'abc123.45xyz');

    // Should only contain numeric value
    expect(usdInput).toHaveValue('123.45');
  });

  it('shows loading spinner during submission', async () => {
    const user = userEvent.setup();
    const mockExecuteBuy = jest.fn(() => new Promise(() => {})); // Never resolves

    PortfolioContext.usePortfolio.mockReturnValue({
      ...mockPortfolioContextValue,
      executeBuy: mockExecuteBuy,
    });

    renderWithTheme(
      <TradeModal
        open={true}
        onClose={jest.fn()}
        cryptocurrency={mockCryptocurrency}
        tradeType="buy"
      />
    );

    const usdInput = screen.getByLabelText(/USD Amount/i);
    await user.type(usdInput, '5000');

    const submitButton = screen.getByRole('button', { name: /Buy BTC/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});
