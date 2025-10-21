/**
 * Test utilities and custom render functions for React Testing Library.
 *
 * Provides wrapper components and helpers for testing components that use:
 * - PortfolioContext
 * - Material-UI theme
 * - React Router
 *
 * Usage:
 *   import { renderWithProviders } from '../utils/testUtils';
 *   renderWithProviders(<MyComponent />);
 */

import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { PortfolioProvider } from '../context/PortfolioContext';
import theme from '../theme/theme';

/**
 * Render component with all necessary providers.
 *
 * Wraps component with:
 * - ThemeProvider (MUI theme)
 * - MemoryRouter (React Router)
 * - PortfolioProvider (optional)
 *
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {boolean} options.withPortfolio - Include PortfolioProvider (default: false)
 * @param {string} options.initialRoute - Initial route for MemoryRouter (default: '/')
 * @returns {Object} - React Testing Library render result
 */
export function renderWithProviders(
  ui,
  { withPortfolio = false, initialRoute = '/', ...renderOptions } = {}
) {
  let Wrapper = ({ children }) => (
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </ThemeProvider>
  );

  if (withPortfolio) {
    const WrapperWithoutPortfolio = Wrapper;
    Wrapper = ({ children }) => (
      <WrapperWithoutPortfolio>
        <PortfolioProvider>
          {children}
        </PortfolioProvider>
      </WrapperWithoutPortfolio>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render component with only ThemeProvider (no routing or context).
 *
 * Use for testing isolated components that don't need routing or portfolio state.
 *
 * @param {React.ReactElement} ui - Component to render
 * @returns {Object} - React Testing Library render result
 */
export function renderWithTheme(ui, renderOptions = {}) {
  const Wrapper = ({ children }) => (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock portfolio context value for testing.
 *
 * Use with jest.mock() or pass to PortfolioProvider.
 */
export const mockPortfolioContext = {
  portfolio: {
    cash_balance: 10000,
    total_holdings_value: 15000,
    total_portfolio_value: 25000,
    initial_investment: 20000,
    total_gain_loss: 5000,
    total_gain_loss_percentage: 25,
  },
  holdings: [
    {
      id: '1',
      cryptocurrency: {
        id: 'btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        current_price: 50000,
      },
      quantity: 0.5,
      average_purchase_price: 48000,
      current_value: 25000,
      gain_loss: 1000,
      gain_loss_percentage: 4.17,
    },
  ],
  loading: false,
  error: null,
  refreshPortfolio: jest.fn(),
};

/**
 * Mock cryptocurrency data for testing.
 */
export const mockCryptos = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    current_price: 50000,
    price_change_24h: 2.5,
    icon_url: 'https://example.com/btc.png',
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    current_price: 3000,
    price_change_24h: -1.2,
    icon_url: 'https://example.com/eth.png',
  },
];

// Re-export everything from @testing-library/react for convenience
export * from '@testing-library/react';
