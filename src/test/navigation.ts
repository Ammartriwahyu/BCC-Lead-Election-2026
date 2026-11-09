/**
 * Test double for next/navigation, installed globally in vitest.setup.ts.
 * Tests drive `navigation.pathname` / `navigation.search` and assert on `navigation.router`.
 */
import { vi } from 'vitest';

export const navigation = {
  pathname: '/',
  search: new URLSearchParams(),
  router: {
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  },
};

export function resetNavigation(pathname = '/', search = ''): void {
  navigation.pathname = pathname;
  navigation.search = new URLSearchParams(search);
  Object.values(navigation.router).forEach((fn) => fn.mockReset());
}

export const navigationModule = {
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.search,
  redirect: vi.fn(),
  notFound: vi.fn(),
};
