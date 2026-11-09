import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4310);
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E runs against a production build made with the mock API enabled (pnpm build:mock).
 * All projects share one server, so the mock database is shared too: specs that change
 * election state run serially (see tests/e2e/helpers.ts).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    timezoneId: 'Asia/Jakarta',
    locale: 'en-US',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1512, height: 982 } },
    },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] }, testMatch: /e2e\/voter.*\.spec\.ts/ },
    { name: 'iphone-14', use: { ...devices['iPhone 14'] }, testMatch: /e2e\/voter.*\.spec\.ts/ },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `${baseURL}/api/election`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_API_MOCKING: 'enabled' },
  },
});
