import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4310);
const baseURL = `http://localhost:${PORT}`;
const DESKTOP = { width: 1512, height: 982 };

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
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP },
    },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] }, testMatch: /e2e\/voter.*\.spec\.ts/ },
    { name: 'iphone-14', use: { ...devices['iPhone 14'] }, testMatch: /e2e\/voter.*\.spec\.ts/ },
    // Spec §10 browsers: the flows tagged @cross-browser also run on Edge, Firefox and desktop
    // Safari (WebKit). Edge uses the installed browser; set E2E_SKIP_EDGE=1 where it is missing.
    ...(process.env.E2E_SKIP_EDGE
      ? []
      : [
          {
            name: 'edge',
            use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: DESKTOP },
            grep: /@cross-browser/,
          },
        ]),
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: DESKTOP },
      grep: /@cross-browser/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: DESKTOP },
      grep: /@cross-browser/,
    },
  ],
  webServer: {
    // Node closes idle keep-alive sockets after 5 s; Playwright's request client sometimes reused one
    // at that moment (ECONNRESET in tests). Keep them open longer than any pause between calls.
    command: `pnpm start --port ${PORT} --keepAliveTimeout 70000`,
    url: `${baseURL}/api/election`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_API_MOCKING: 'enabled' },
  },
});
