/**
 * Shared Playwright `test`: every spec imports it from here instead of '@playwright/test'.
 * Spec §10: "no errors or warnings in the browser console". Each test fails if a page logged a
 * console error / warning or threw an uncaught exception.
 *
 * Allowed: the browser's own network messages for requests a test makes fail on purpose
 * (401 after sign-out, 409 conflicts, aborted routes, offline). Those are logged by Chromium as
 * "Failed to load resource" / net::ERR_* and are not application errors.
 */
import { expect, test as base, type ConsoleMessage } from '@playwright/test';

const EXPECTED_NETWORK_NOISE = [
  /Failed to load resource/i,
  /net::ERR_/,
  /EventSource/i, // stream refused or aborted in fallback tests
  /NS_ERROR_/, // Firefox network failures
  // WebKit notice: COOP is sent without COEP, so SharedArrayBuffer is off. The app does not use it,
  // and COEP `require-corp` would block candidate photos from the backend's host.
  /not cross-origin isolated/i,
];

function describe(message: ConsoleMessage): string {
  const location = message.location();
  return `[${message.type()}] ${message.text()} (${location.url}:${location.lineNumber})`;
}

export const test = base.extend<{ consoleGuard: undefined }>({
  consoleGuard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() !== 'error' && message.type() !== 'warning') return;
        if (EXPECTED_NETWORK_NOISE.some((pattern) => pattern.test(message.text()))) return;
        problems.push(describe(message));
      });
      page.on('pageerror', (error) => {
        problems.push(`[pageerror] ${error.message}`);
      });
      await use(undefined);
      expect(problems, 'browser console must stay clean').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export type { APIRequestContext, Browser, BrowserContext, Locator, Page } from '@playwright/test';
