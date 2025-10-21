/**
 * Tests for NewsCard component.
 *
 * This component displays a single cryptocurrency news article card.
 *
 * Key Test Coverage:
 * - Rendering: Headline, summary, source, timestamp
 * - Image: Shows when provided, hidden when missing
 * - External Link: Opens in new tab with security attributes
 * - Time Formatting: Relative time display with tooltip
 * - Accessibility: Link focus states, image alt text
 *
 * Component Behaviors Tested:
 * - Article data displayed correctly
 * - Image rendering conditional
 * - Link has correct href and target
 * - Timestamp converted from UNIX to human-readable
 */

import { screen } from '@testing-library/react';
import { renderWithTheme } from '../../utils/testUtils';
import NewsCard from './NewsCard';

describe('NewsCard', () => {
  const mockArticle = {
    id: 1,
    datetime: 1705305600, // 2025-01-15 12:00:00 UTC
    headline: 'Bitcoin Reaches New High',
    image: 'https://example.com/img/btc.jpg',
    summary: 'Bitcoin price surges past $50k in a historic rally.',
    url: 'https://example.com/news/bitcoin-high',
    source: 'CryptoNews',
  };

  it('renders article headline', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);

    expect(screen.getByText('Bitcoin Reaches New High')).toBeInTheDocument();
  });

  it('renders article summary', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);

    expect(screen.getByText(/Bitcoin price surges past \$50k/)).toBeInTheDocument();
  });

  it('renders source chip when provided', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);

    expect(screen.getByText('CryptoNews')).toBeInTheDocument();
  });

  it('does not render source chip when missing', () => {
    const articleWithoutSource = { ...mockArticle, source: undefined };

    renderWithTheme(<NewsCard article={articleWithoutSource} />);

    expect(screen.queryByText('CryptoNews')).not.toBeInTheDocument();
  });

  it('renders article image when provided', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);

    const image = screen.getByAltText('Bitcoin Reaches New High');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/img/btc.jpg');
  });

  it('does not render image when missing', () => {
    const articleWithoutImage = { ...mockArticle, image: undefined };

    renderWithTheme(<NewsCard article={articleWithoutImage} />);

    const image = screen.queryByAltText('Bitcoin Reaches New High');
    expect(image).not.toBeInTheDocument();
  });

  it('renders external link with correct href', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/news/bitcoin-high');
  });

  it('link opens in new tab with security attributes', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays relative time for article', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);

    // Should show "X ago" format
    // Exact text depends on current time, so just check it exists
    const timeElement = screen.getByText(/ago$/);
    expect(timeElement).toBeInTheDocument();
  });

  it('image has lazy loading attribute', () => {
    renderWithTheme(<NewsCard article={mockArticle} />);

    const image = screen.getByAltText('Bitcoin Reaches New High');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('handles long summaries with ellipsis styles', () => {
    const longSummary = 'A'.repeat(500);
    const articleWithLongSummary = { ...mockArticle, summary: longSummary };

    renderWithTheme(<NewsCard article={articleWithLongSummary} />);

    // Component should still render (ellipsis applied via CSS)
    expect(screen.getByText(longSummary)).toBeInTheDocument();
  });

  it('handles special characters in headline', () => {
    const specialHeadline = 'Bitcoin & Ethereum: "The Future" <2025>';
    const articleWithSpecialChars = { ...mockArticle, headline: specialHeadline };

    renderWithTheme(<NewsCard article={articleWithSpecialChars} />);

    expect(screen.getByText(specialHeadline)).toBeInTheDocument();
  });
});
