/**
 * Phase 1 platform checks: shared server-side mock, session cookies, route guards, security headers.
 */
import { expect, test } from '@playwright/test';

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
      state: 'NOT_STARTED',
    });
    await applyScenario(request, 'open');
    await expect((await booth.request.get('/api/election')).json()).resolves.toMatchObject({
      state: 'OPEN',
    });
    await expect((await display.request.get('/api/display')).json()).resolves.toMatchObject({
      screen: 'VOTING_OPEN',
    });
  } finally {
    await booth.close();
    await display.close();
  }
});

test('voter sign-in sets an HttpOnly session cookie', async ({ page }) => {
  const response = await page.request.post('/api/auth/voter/sign-in', { data: ACCOUNTS.voter });
  expect(response.status()).toBe(200);
  const cookie = (await page.context().cookies()).find((c) => c.name === 'pilketum_voter_session');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  await expect((await page.request.get('/api/me')).json()).resolves.toMatchObject({
    email: ACCOUNTS.voter.email,
  });
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
  expect(state.election.state).toBe('NOT_STARTED');
});
