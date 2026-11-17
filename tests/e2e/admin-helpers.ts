import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

import { ACCOUNTS, type Account } from './helpers';

/** Signs in through the committee sign-in page (A0) and waits for the panel. */
export async function adminSignIn(
  page: Page,
  account: Account = ACCOUNTS.committee,
  path = '/admin/sign-in',
): Promise<void> {
  await page.goto(path);
  await page.getByRole('textbox', { name: 'Username' }).fill(account.username);
  await page
    .getByLabel(/^Password/)
    .first()
    .fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  // The breadcrumb is visible at every width (the sidebar is a drawer below 1024 px).
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
}

/** A member votes through the API, as a booth would (no candidate is ever echoed back). */
export async function castVote(
  request: APIRequestContext,
  account: Account = ACCOUNTS.voter,
  candidateId = '1',
): Promise<void> {
  await request.post('/api/auth/login', { data: account });
  const response = await request.post('/api/votes', {
    data: { candidate_id: Number(candidateId) },
  });
  expect(response.status()).toBe(201);
}

export function displayRow(page: Page, screen: string): Locator {
  return page.getByTestId(`display-row-${screen}`);
}

/** Value of a stat card by its label ("Votes received" -> "2"). */
export function statValue(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).locator('xpath=following-sibling::p[1]');
}

/** Collects the path + query of every request to `pathPrefix` made by the page. */
export function trackRequests(page: Page, pathPrefix: string): string[] {
  const seen: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith(pathPrefix)) seen.push(`${url.pathname}${url.search}`);
  });
  return seen;
}
