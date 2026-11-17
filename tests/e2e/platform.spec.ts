/**
 * Phase 1 platform checks: shared server-side mock, session cookies, route guards, security headers.
 */
import { expect, test } from '../fixtures';
import { ACCOUNTS, applyScenario, getMockState } from './helpers';

test.beforeEach(async ({ request }) => {
  await applyScenario(request, 'not-started');
});

test('mock state is shared across browser contexts (booths, admin, display)', async ({
  browser,
  request,
}) => {
  const booth = await browser.newContext();
  const display = await browser.newContext();
  try {
    await expect((await booth.request.get('/api/election')).json()).resolves.toMatchObject({
      status: 'not_started',
    });
    await applyScenario(request, 'open');
    await expect((await booth.request.get('/api/election')).json()).resolves.toMatchObject({
      status: 'open',
    });
    await expect((await display.request.get('/api/display')).json()).resolves.toMatchObject({
      screen: 'voting_open',
    });
  } finally {
    await booth.close();
    await display.close();
  }
});

test('voter sign-in keeps the Bearer token in an HttpOnly cookie, never in the body', async ({
  page,
}) => {
  const response = await page.request.post('/api/auth/login', { data: ACCOUNTS.voter });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as Record<string, unknown>;
  expect(body).not.toHaveProperty('token');
  expect(body).not.toHaveProperty('expires_at');
  const cookie = (await page.context().cookies()).find((c) => c.name === 'pilketum_voter_session');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  expect(cookie?.value).toMatch(/^[0-9a-f]{32,}/);
  await expect((await page.request.get('/api/me')).json()).resolves.toMatchObject({
    voter: { email: ACCOUNTS.voter.username },
  });
  // Unknown paths are not forwarded to the backend.
  expect((await page.request.get('/api/anything-else')).status()).toBe(404);
});

test('voter routes redirect to sign-in without a session, keeping the destination', async ({
  page,
}) => {
  await page.goto('/candidates');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fcandidates$/);
});

test('admin routes redirect to admin sign-in without a session', async ({ page }) => {
  await page.goto('/admin/voters?q=abc');
  await expect(page).toHaveURL(/\/admin\/sign-in\?next=%2Fadmin%2Fvoters%3Fq%3Dabc$/);
});

test('pages send security headers with a per-request CSP nonce', async ({ request }) => {
  const first = await request.get('/sign-in');
  const second = await request.get('/sign-in');
  const csp = first.headers()['content-security-policy'] ?? '';
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(second.headers()['content-security-policy']).not.toBe(csp);
  expect(first.headers()['x-frame-options']).toBe('DENY');
  expect(first.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(first.headers()['cache-control']).toContain('no-store');
  expect(first.headers()['x-powered-by']).toBeUndefined();
});

test('admin endpoints reject requests without a committee session', async ({ request }) => {
  expect((await request.get('/api/admin/overview')).status()).toBe(401);
  expect((await request.get('/api/admin/results')).status()).toBe(401);
  const state = await getMockState(request);
  expect(state.status).toBe('not_started');
});
