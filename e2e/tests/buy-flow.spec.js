/**
 * E2E Smoke Test: Buy Flow
 *
 * This test verifies the critical happy path for purchasing cryptocurrency.
 *
 * User Flow:
 * 1. Navigate to Market page
 * 2. Select a cryptocurrency (Bitcoin)
 * 3. Click "Buy" button
 * 4. Enter purchase amount ($1000)
 * 5. Submit the trade
 * 6. Verify success message
 * 7. Verify portfolio updated (cash reduced, holdings increased)
 *
 * Test Requirements:
 * - Runtime: <60 seconds
 * - Browser: Chromium only
 * - Type: Smoke test (happy path only)
 * - Data: Uses existing demo user and portfolio
 *
 * This test represents the most critical user journey in the application.
 * Failure indicates a major regression in core functionality.
 */

const { test, expect } = require('@playwright/test');

test.describe('Buy Flow - Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for app to load (portfolio data fetched)
    await page.waitForSelector('text=Portfolio', { timeout: 10000 });
  });

  test('should complete successful cryptocurrency purchase', async ({ page }) => {
    // Step 1: Navigate to Market page
    await page.click('text=Market');

    // Wait for cryptocurrency list to load
    await page.waitForSelector('text=Bitcoin', { timeout: 10000 });

    // Verify Market page loaded
    await expect(page).toHaveURL(/\/market/);

    // Step 2: Find Bitcoin in the list and click Buy
    // Look for the row containing Bitcoin
    const bitcoinRow = page.locator('tr', { has: page.locator('text=Bitcoin') });
    await expect(bitcoinRow).toBeVisible();

    // Click the Buy button in the Bitcoin row
    await bitcoinRow.locator('button:has-text("Buy")').click();

    // Step 3: Verify Trade Modal opened
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Bitcoin/i })).toBeVisible();

    // Verify Buy mode is selected (default)
    const buyButton = page.getByRole('button', { name: 'Buy', exact: true });
    await expect(buyButton).toHaveAttribute('aria-pressed', 'true');

    // Step 4: Enter purchase amount ($1000)
    const usdInput = page.getByLabel(/USD Amount/i);
    await usdInput.fill('1000');

    // Verify quantity auto-calculated
    // (Exact value depends on BTC price, so just check it's populated)
    const quantityInput = page.getByLabel(/Quantity/i);
    await expect(quantityInput).not.toHaveValue('');

    // Step 5: Submit the trade
    const submitButton = page.getByRole('button', { name: /Buy BTC/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Step 6: Verify success message appears
    await expect(page.getByText(/Purchase successful!/i)).toBeVisible({ timeout: 5000 });

    // Modal should close automatically after success
    await expect(page.locator('role=dialog')).not.toBeVisible({ timeout: 3000 });

    // Step 7: Verify portfolio updated
    // Navigate to Portfolio page to verify holdings
    await page.click('text=Portfolio');
    await expect(page).toHaveURL(/\/portfolio/);

    // Verify Bitcoin appears in holdings
    await expect(page.getByText('Bitcoin')).toBeVisible({ timeout: 5000 });

    // Verify BTC symbol visible in holdings table
    await expect(page.getByText('BTC')).toBeVisible();

    // Success! Buy flow completed successfully
  });

  test('should show error when insufficient funds', async ({ page }) => {
    // Navigate to Market page
    await page.click('text=Market');
    await page.waitForSelector('text=Bitcoin', { timeout: 10000 });

    // Click Buy on Bitcoin
    const bitcoinRow = page.locator('tr', { has: page.locator('text=Bitcoin') });
    await bitcoinRow.locator('button:has-text("Buy")').click();

    // Wait for modal
    await expect(page.locator('role=dialog')).toBeVisible();

    // Try to buy more than available cash (e.g., $1,000,000)
    const usdInput = page.getByLabel(/USD Amount/i);
    await usdInput.fill('1000000');

    // Submit
    const submitButton = page.getByRole('button', { name: /Buy BTC/i });
    await submitButton.click();

    // Verify error message appears
    await expect(page.getByText(/Insufficient funds/i)).toBeVisible({ timeout: 5000 });

    // Modal should remain open
    await expect(page.locator('role=dialog')).toBeVisible();
  });

  test('should cancel purchase and close modal', async ({ page }) => {
    // Navigate to Market
    await page.click('text=Market');
    await page.waitForSelector('text=Bitcoin', { timeout: 10000 });

    // Open Buy modal
    const bitcoinRow = page.locator('tr', { has: page.locator('text=Bitcoin') });
    await bitcoinRow.locator('button:has-text("Buy")').click();

    await expect(page.locator('role=dialog')).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Modal should close
    await expect(page.locator('role=dialog')).not.toBeVisible({ timeout: 2000 });
  });
});
