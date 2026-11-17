import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { ACCOUNTS, SCREEN_WIRE } from './helpers';

/** What the committee does with "Show on display", through the API (second committee account). */
export async function showOnDisplay(request: APIRequestContext, screen: string): Promise<void> {
  const wire = SCREEN_WIRE[screen];
  if (!wire) {
    // OPENS_SOON / VOTING_OPEN follow the voting status: the scenario already put them on air.
    const current = (await (await request.get('/api/display')).json()) as { screen: string };
    const expected = { OPENS_SOON: 'voting_opens_soon', VOTING_OPEN: 'voting_open' }[screen];
    expect(current.screen, `${screen} follows the voting status`).toBe(expected);
    return;
  }
  await request.post('/api/admin/auth/login', { data: ACCOUNTS.committee2 });
  const response = await request.put('/api/admin/display', { data: { screen: wire } });
  expect(response.ok()).toBe(true);
}

/** The screen currently rendered on /display (data-screen of the visible layer). */
export function screenOnPage(page: Page) {
  return page.locator('[data-screen]');
}

export async function openDisplay(page: Page): Promise<void> {
  await page.goto('/display');
  await expect(screenOnPage(page)).toHaveCount(1);
}
