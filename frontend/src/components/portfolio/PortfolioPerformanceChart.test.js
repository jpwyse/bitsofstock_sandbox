/**
 * Tests for PortfolioPerformanceChart Component
 *
 * Coverage:
 * - 3M timeframe renders
 * - YTD is longest selectable timeframe
 * - Loading/empty/error states
 * - Timeframe selection controls
 * - Chart renders without errors
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortfolioPerformanceChart from './PortfolioPerformanceChart';
import { PortfolioProvider } from '../../context/PortfolioContext';
import api from '../../services/api';

// Mock the API service
jest.mock('../../services/api');

// Mock the PortfolioContext
const mockPortfolio = {
  initial_investment: 10000,
  total_portfolio_value: 12500,
  total_gain_loss: 2500,
  total_gain_loss_percentage: 25,
};

const mockHistoryData = {
  timeframe: 'YTD',
  data_points: [
    { timestamp: '2025-01-01T00:00:00Z', portfolio_value: 10000 },
    { timestamp: '2025-02-01T00:00:00Z', portfolio_value: 10500 },
    { timestamp: '2025-03-01T00:00:00Z', portfolio_value: 11000 },
    { timestamp: '2025-10-01T00:00:00Z', portfolio_value: 12500 },
  ],
};

const renderWithContext = (component) => {
  return render(
    <PortfolioProvider>
      {component}
    </PortfolioProvider>
  );
};

describe('PortfolioPerformanceChart', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    api.getPortfolioHistory.mockResolvedValue(mockHistoryData);

    renderWithContext(<PortfolioPerformanceChart />);

    expect(screen.getByText(/loading performance data/i)).toBeInTheDocument();
  });

  it('renders chart with data after loading', async () => {
    api.getPortfolioHistory.mockResolvedValue(mockHistoryData);

    renderWithContext(<PortfolioPerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText(/portfolio performance/i)).toBeInTheDocument();
    });
  });

  it('displays all timeframe buttons including 3M', async () => {
    api.getPortfolioHistory.mockResolvedValue(mockHistoryData);

    renderWithContext(<PortfolioPerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText(/portfolio performance/i)).toBeInTheDocument();
    });

    // Check that all required timeframes are present
    expect(screen.getByText('1D')).toBeInTheDocument();
    expect(screen.getByText('5D')).toBeInTheDocument();
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('3M')).toBeInTheDocument();
    expect(screen.getByText('6M')).toBeInTheDocument();
    expect(screen.getByText('YTD')).toBeInTheDocument();
  });

  it('does NOT display timeframes beyond YTD (1Y, 5Y, MAX)', async () => {
    api.getPortfolioHistory.mockResolvedValue(mockHistoryData);

    renderWithContext(<PortfolioPerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText(/portfolio performance/i)).toBeInTheDocument();
    });

    // Verify that longer timeframes are NOT present
    expect(screen.queryByText('1Y')).not.toBeInTheDocument();
    expect(screen.queryByText('5Y')).not.toBeInTheDocument();
    expect(screen.queryByText('MAX')).not.toBeInTheDocument();
  });

  it('allows user to select different timeframes', async () => {
    api.getPortfolioHistory.mockResolvedValue(mockHistoryData);

    renderWithContext(<PortfolioPerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText(/portfolio performance/i)).toBeInTheDocument();
    });

    // Click on 3M timeframe button
    const button3M = screen.getByText('3M');
    await userEvent.click(button3M);

    // API should be called with 3M timeframe
    await waitFor(() => {
      expect(api.getPortfolioHistory).toHaveBeenCalledWith('3M');
    });
  });

  it('displays error state when API fails', async () => {
    api.getPortfolioHistory.mockRejectedValue(new Error('API Error'));

    renderWithContext(<PortfolioPerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load performance data/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no data is available', async () => {
    api.getPortfolioHistory.mockResolvedValue({ data_points: [] });

    renderWithContext(<PortfolioPerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText(/no performance data available/i)).toBeInTheDocument();
    });
  });

  it('displays performance summary metrics', async () => {
    api.getPortfolioHistory.mockResolvedValue(mockHistoryData);

    renderWithContext(<PortfolioPerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText(/initial investment/i)).toBeInTheDocument();
      expect(screen.getByText(/current value/i)).toBeInTheDocument();
      expect(screen.getByText(/total gain\/loss/i)).toBeInTheDocument();
      expect(screen.getByText(/total return/i)).toBeInTheDocument();
    });
  });

  it('defaults to YTD timeframe on initial load', async () => {
    api.getPortfolioHistory.mockResolvedValue(mockHistoryData);

    renderWithContext(<PortfolioPerformanceChart />);

    // Initial API call should use YTD
    await waitFor(() => {
      expect(api.getPortfolioHistory).toHaveBeenCalledWith('YTD');
    });
  });
});
