/**
 * Cross-role flows (spec §10): the committee panel, a booth and the public display are open at
 * the same time and follow each other without a reload.
 * Tagged @cross-browser: these also run on Edge, Firefox and desktop WebKit.
 */
import { expect, test, type Browser } from '../fixtures';
import { adminSignIn, displayRow, statValue } from './admin-helpers';
import { openDisplay, screenOnPage } from './display-helpers';
import { ACCOUNTS, applyScenario, getMockState } from './helpers';
import { reviewButton, signIn, submitVoteButton } from './voter-helpers';

const LIVE = { timeout: 7_000 };

test.use({ viewport: { width: 1512, height: 982 } });

test('open → close → reopen → close from the panel, followed by a booth and the display @cross-browser', async ({
  playwright,
  browser,
  browserName,
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await applyScenario(request, 'not-started');
  // WebKit stalls automation of several pages in one instance, so the booth and the display get
  // their own WebKit instances there. Chromium and Edge use separate contexts of the same browser
  // (three real Edge instances are too heavy for a laptop and made the run flaky).
  const separate = browserName === 'webkit';
  const [boothBrowser, displayBrowser]: [Browser, Browser] = separate
    ? await Promise.all([playwright.webkit.launch(), playwright.webkit.launch()])
    : [browser, browser];
  const boothContext = await boothBrowser.newContext({ viewport: { width: 1512, height: 982 } });
  const displayContext = await displayBrowser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const booth = await boothContext.newPage();
  const display = await displayContext.newPage();

  await adminSignIn(page);
  await signIn(booth);
  await expect(booth.getByRole('heading', { level: 1 })).toHaveText("Voting hasn't opened yet");
  await expect(booth.getByRole('button', { name: /^Select / })).toHaveCount(0);
  await openDisplay(display);
  await expect(screenOnPage(display)).toHaveAttribute('data-screen', 'OPENS_SOON');

  // 1. Open
  await page.getByRole('button', { name: 'Open voting now' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Open voting' }).click();
  await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
  await expect(booth.getByRole('heading', { level: 1 })).toHaveText(
    'Pick your next chairperson',
    LIVE,
  );
  await expect(screenOnPage(display)).toHaveAttribute('data-screen', 'VOTING_OPEN', LIVE);

  // The booth picks but has not submitted when voting closes.
  await booth.getByRole('button', { name: 'Select Candidate Name 02' }).click();

  // 2. Close
  await page.getByRole('button', { name: 'Close voting' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close voting' }).click();
  await expect(page.getByRole('button', { name: 'Reopen voting' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Results', exact: true })).toBeVisible();
  await expect(booth).toHaveURL(/\/closed$/, LIVE);
  await expect(screenOnPage(display)).toHaveAttribute('data-screen', 'VOTING_CLOSED', LIVE);

  // 3. Reopen: the booth goes back to the candidates without a reload; the pick (memory only) is kept.
  await page.getByRole('button', { name: 'Reopen voting' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reopen voting' }).click();
  await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Results\s*, locked/ })).toBeVisible();
  await expect(booth).toHaveURL(/\/candidates$/, LIVE);
  await expect(screenOnPage(display)).toHaveAttribute('data-screen', 'VOTING_OPEN', LIVE);

  // The booth votes; the panel and the display follow.
  await expect(booth.getByRole('button', { name: 'Selected Candidate Name 02' })).toBeVisible();
  await reviewButton(booth).click();
  await submitVoteButton(booth).click();
  await expect(booth).toHaveURL(/\/vote\/submitted$/);
  await expect(statValue(page, 'Votes received')).toHaveText('2', LIVE);
  await expect(display.getByText('2 of 139 members have voted')).toBeVisible(LIVE);

  // 4. Close again: the results include the vote.
  await page.getByRole('button', { name: 'Close voting' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close voting' }).click();
  await page.getByRole('link', { name: 'View results' }).click();
  const rows = page.getByRole('list', { name: 'Results by candidate' }).getByRole('listitem');
  await expect(rows.filter({ hasText: 'Candidate Name 02' })).toContainText('1 vote');
  await expect(rows.filter({ hasText: 'Candidate Name 01' })).toContainText('1 vote');

  const state = await getMockState(request);
  expect(state.status).toBe('closed');
  expect(state.votesReceived).toBe(2);
  expect(state.voteRequests).toBe(1);
  await Promise.all([boothContext.close(), displayContext.close()]);
  if (separate) await Promise.all([boothBrowser.close(), displayBrowser.close()]);
});

test('two committee members: the second one sees a conflict, not a double change', async ({
  browser,
  page,
  request,
}) => {
  await applyScenario(request, 'open');
  const secondContext = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  const second = await secondContext.newPage();
  await adminSignIn(page);
  await adminSignIn(second, ACCOUNTS.committee2);

  // Both open the confirmation; the first one confirms.
  await page.getByRole('button', { name: 'Close voting' }).click();
  await second.getByRole('button', { name: 'Close voting' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close voting' }).click();
  await expect(page.getByRole('button', { name: 'Reopen voting' })).toBeVisible();

  await second.getByRole('dialog').getByRole('button', { name: 'Close voting' }).click();
  await expect(
    second.getByText('Someone else changed the voting state', { exact: true }),
  ).toBeVisible();
  await expect(second.getByRole('button', { name: 'Reopen voting' })).toBeVisible();
  // The backend refused the second close (INVALID_STATE): still closed, nothing reopened.
  expect((await getMockState(request)).status).toBe('closed');
  await secondContext.close();
});

test('the display changes only when the committee changes it', async ({ browser, request }) => {
  await applyScenario(request, 'closed');
  const displayContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const display = await displayContext.newPage();
  const panel = await (
    await browser.newContext({ viewport: { width: 1512, height: 982 } })
  ).newPage();
  await adminSignIn(panel);
  await openDisplay(display);
  await expect(screenOnPage(display)).toHaveAttribute('data-screen', 'VOTING_CLOSED');

  await panel.getByRole('button', { name: 'Show on display: The winner is…' }).click();
  await expect(screenOnPage(display)).toHaveAttribute('data-screen', 'WINNER_REVEAL', LIVE);
  // Nothing happens on its own: the suspense screen stays up (and the page is never reloaded).
  const marker = await display.evaluate(() => {
    (window as unknown as { __marker: number }).__marker = 1;
    return 1;
  });
  await display.waitForTimeout(8_000);
  await expect(screenOnPage(display)).toHaveAttribute('data-screen', 'WINNER_REVEAL');
  expect(await display.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(
    marker,
  );
  await expect(displayRow(panel, 'WINNER_REVEAL')).toContainText('On screen');

  await panel.getByRole('button', { name: 'Show on display: Most votes' }).click();
  await expect(screenOnPage(display)).toHaveAttribute('data-screen', 'MOST_VOTES', LIVE);
  await displayContext.close();
});
