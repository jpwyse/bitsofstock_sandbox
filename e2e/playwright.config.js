/**
 * Playwright configuration for E2E testing.
 *
 * Configuration optimized for:
 * - Fast execution (<60s for smoke tests)
 * - Chromium only (single browser for speed)
 * - Screenshots/videos on failure
 * - CI-friendly settings
 *
 * See: https://playwright.dev/docs/test-configuration
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory
  testDir: './tests',

  // Maximum time one test can run (60 seconds per requirement)
  timeout: 60000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use - list for terminal, html for detailed results
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000',

    // Collect trace on failure (for debugging)
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for Chromium only (for speed)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev servers before starting tests
  webServer: [
    {
      command: 'cd ../backend && python manage.py runserver',
      url: 'http://127.0.0.1:8000/api/portfolio/summary',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd ../frontend && npm start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
