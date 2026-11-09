import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { ACCOUNTS } from './helpers';

interface Account {
  email: string;
  password: string;
}

export async function signIn(page: Page, account: Account = ACCOUNTS.voter): Promise<void> {
  if (!page.url().includes('/sign-in')) await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(account.email);
  await page
    .getByLabel(/^Password/, { exact: false })
    .first()
    .fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/** Committee actions without the admin UI (Phase 4): sign in through the API and change state. */
export async function committee(request: APIRequestContext, action: 'open' | 'close' | 'reopen') {
  await request.post('/api/admin/auth/sign-in', { data: ACCOUNTS.committee });
  const expected = { open: 'NOT_STARTED', close: 'OPEN', reopen: 'CLOSED' }[action];
  const response = await request.post(`/api/admin/election/${action}`, {
    data: { expectedState: expected },
  });
  expect(response.ok()).toBe(true);
}

/** Desktop shows the pick bar, mobile the fixed action bar; both have a review button. */
export function reviewButton(page: Page) {
  return page.getByRole('button', { name: /^Review (and|&) submit$/ }).filter({ visible: true });
}

export function submitVoteButton(page: Page) {
  return page.getByRole('button', { name: 'Submit vote' });
}
