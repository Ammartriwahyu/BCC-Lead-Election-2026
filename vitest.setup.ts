import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { clearSessionEnding } from '@/features/auth/sessionEnding';
import { resetDb } from '@/mocks/db';
import { server } from '@/mocks/node';
import { clearCookieJar, installCookieJar } from '@/test/cookieJar';
import { resetNavigation } from '@/test/navigation';

vi.mock('next/navigation', async () => (await import('@/test/navigation')).navigationModule);

// jsdom has no matchMedia; default to desktop (min-width queries false, max-width false).
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

let uninstallCookieJar: () => void = () => undefined;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  uninstallCookieJar = installCookieJar();
});

beforeEach(() => {
  resetDb();
  clearCookieJar();
  resetNavigation();
  clearSessionEnding();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  uninstallCookieJar();
  server.close();
});
