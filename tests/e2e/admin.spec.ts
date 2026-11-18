/**
 * Committee panel (spec §4.4): sign in, state changes with confirmation and conflicts,
 * live turnout, voter list, results and display control. Desktop only (admin is ≥ 1024 px).
 * The mock database is shared, so every test starts by applying a scenario.
 */
import { expect, test, type APIRequestContext } from '../fixtures';
import { adminSignIn, castVote, displayRow, statValue, trackRequests } from './admin-helpers';
import { showOnDisplay } from './display-helpers';
import { ACCOUNTS, applyScenario, getMockState } from './helpers';
import { committee } from './voter-helpers';

/** Sidebar "Results" while locked: the lock is spoken as ", locked until voting opens". */
const RESULTS_LOCKED = /^Results\s*, locked until voting opens$/;

async function screenOnAir(request: APIRequestContext): Promise<Record<string, unknown>> {
  return (await (await request.get('/api/display')).json()) as Record<string, unknown>;
}

test.describe('committee sign in', () => {
  test('wrong password shows the banner, the right one opens the overview', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'not-started');
    await page.goto('/admin/sign-in');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in as committee' }),
    ).toBeVisible();
    await page.getByRole('textbox', { name: 'Username' }).fill(ACCOUNTS.committee.username);
    await page
      .getByLabel(/^Password/)
      .first()
      .fill('nope');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: "don't match" })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/sign-in$/);

    await page
      .getByLabel(/^Password/)
      .first()
      .fill(ACCOUNTS.committee.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    await expect(page.getByText('Election Committee', { exact: true })).toBeVisible();
  });

  test('a voter account cannot open the panel', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.goto('/admin/sign-in');
    await page.getByRole('textbox', { name: 'Username' }).fill(ACCOUNTS.voter.username);
    await page
      .getByLabel(/^Password/)
      .first()
      .fill(ACCOUNTS.voter.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: "don't match" })).toBeVisible();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/sign-in\?next=%2Fadmin$/);
  });

  test('returns to the page that asked for sign-in', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.goto('/admin/voters?q=member001');
    await expect(page).toHaveURL(/\/admin\/sign-in\?next=/);
    await adminSignIn(page, ACCOUNTS.committee, page.url());
    await expect(page).toHaveURL(/\/admin\/voters\?q=member001$/);
    await expect(page.getByRole('searchbox')).toHaveValue('member001');
    await expect(page.getByText('Showing 1–1 of 1')).toBeVisible();
  });

  test('sign out ends the session and Back does not show the panel', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await adminSignIn(page);
    await page.getByRole('link', { name: 'Voter list' }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/sign-in\?reason=signed-out$/);
    // Back may restore the panel shell from the router cache; it must not stay there.
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/sign-in/);
    await expect(page.getByRole('navigation', { name: 'Committee menu' })).toHaveCount(0);
    await page.goto('/admin/voters');
    await expect(page).toHaveURL(/\/admin\/sign-in\?next=%2Fadmin%2Fvoters$/);
  });

  test('an expired session returns to sign-in with a message', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await adminSignIn(page);
    // Resetting the mock drops every session, like a server-side expiry.
    await applyScenario(request, 'open');
    await expect(page).toHaveURL(/\/admin\/sign-in\?reason=expired&next=%2Fadmin$/, {
      timeout: 10_000,
    });
    await expect(page.getByRole('status').filter({ hasText: 'Your session ended' })).toBeVisible();
  });
});

test.describe('voting state', () => {
  test('open, watch turnout live, close, then view results', async ({ page, request }) => {
    await applyScenario(request, 'not-started');
    await adminSignIn(page);
    await expect(page.getByText('Not started', { exact: true }).first()).toBeVisible();
    await expect(statValue(page, 'Candidates')).toHaveText('3');
    await expect(displayRow(page, 'OPENS_SOON')).toContainText('On screen');

    // Open voting: confirmation first, Esc cancels and focus returns to the button.
    const openButton = page.getByRole('button', { name: 'Open voting now' });
    await openButton.click();
    await expect(page.getByRole('dialog', { name: 'Open voting now?' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(openButton).toBeFocused();
    expect((await getMockState(request)).status).toBe('not_started');

    await openButton.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Open voting' }).click();
    await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(displayRow(page, 'VOTING_OPEN')).toContainText('On screen');
    await expect(statValue(page, 'Votes received')).toHaveText('1');

    // A member votes in a booth: the overview follows within 5 s without a reload.
    await castVote(request);
    await expect(statValue(page, 'Votes received')).toHaveText('2', { timeout: 6_000 });
    await expect(statValue(page, 'Not voted yet')).toHaveText('137');
    await expect(page.getByText('2 of 139 members', { exact: true })).toBeVisible();

    // Close voting: the dialog says who is left.
    await page.getByRole('button', { name: 'Close voting' }).click();
    const closeDialog = page.getByRole('dialog', { name: 'Close voting now?' });
    await expect(closeDialog).toContainText('2 of 139 members have voted');
    await expect(closeDialog).toContainText('137 members have not voted');
    await closeDialog.getByRole('button', { name: 'Close voting' }).click();
    await expect(page.getByRole('button', { name: 'Reopen voting' })).toBeVisible();
    await expect(statValue(page, 'Final turnout')).toHaveText('1.4%');
    await expect(displayRow(page, 'VOTING_CLOSED')).toContainText('On screen');
    expect((await getMockState(request)).status).toBe('closed');

    await page.getByRole('link', { name: 'View results' }).click();
    await expect(page).toHaveURL(/\/admin\/results$/);
    await expect(page.getByText('2 votes from 139 registered members.')).toBeVisible();
  });

  test('a double click on confirm sends one request', async ({ page, request }) => {
    await applyScenario(request, 'not-started');
    await adminSignIn(page);
    const calls = trackRequests(page, '/api/admin/election/');
    await page.getByRole('button', { name: 'Open voting now' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Open voting' }).dblclick();
    await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
    expect(calls).toEqual(['/api/admin/election/open']);
  });

  test('conflict: a second committee member acted first', async ({ page, request }) => {
    await applyScenario(request, 'not-started');
    await adminSignIn(page);
    await page.getByRole('button', { name: 'Open voting now' }).click();
    await expect(page.getByRole('dialog', { name: 'Open voting now?' })).toBeVisible();
    // Meanwhile the other committee member opens voting.
    await committee(request, 'open');

    await page.getByRole('dialog').getByRole('button', { name: 'Open voting' }).click();
    await expect(
      page.getByText('Someone else changed the voting state', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
    // The backend refused the second "open" (INVALID_STATE): voting is open once.
    expect((await getMockState(request)).status).toBe('open');
  });

  test('another committee member closes voting: this panel follows', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await adminSignIn(page);
    await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
    await committee(request, 'close');
    await expect(page.getByRole('button', { name: 'Reopen voting' })).toBeVisible({
      timeout: 6_000,
    });
    await expect(page.getByRole('link', { name: 'Results', exact: true })).toBeVisible();
  });
});

test.describe('live panel: one stream, polling only as a fallback', () => {
  test('the overview follows a vote over /admin/stream without polling', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    const overviewCalls = trackRequests(page, '/api/admin/overview');
    const streams = trackRequests(page, '/api/admin/stream');
    await adminSignIn(page);
    await expect(statValue(page, 'Votes received')).toHaveText('1');
    await expect.poll(() => streams.length).toBe(1);

    // Pushed by the stream: well under the 4 s poll.
    const before = overviewCalls.length;
    await castVote(request);
    await expect(statValue(page, 'Votes received')).toHaveText('2', { timeout: 2_000 });
    // No polling while the stream is open (10 s would be 2–3 polls).
    await page.waitForTimeout(10_000);
    expect(overviewCalls.length - before).toBe(0);
  });

  test('without the stream the panel keeps polling', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.route('**/api/admin/stream', (route) => route.abort());
    await adminSignIn(page);
    await expect(statValue(page, 'Votes received')).toHaveText('1');
    await castVote(request);
    await expect(statValue(page, 'Votes received')).toHaveText('2', { timeout: 6_000 });
  });
});

test.describe('results: locked before voting opens, live while open', () => {
  test('sidebar and direct URL both explain the lock, and totals are never requested', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'not-started');
    const resultsCalls = trackRequests(page, '/api/admin/results');
    await adminSignIn(page);

    await page.getByRole('button', { name: RESULTS_LOCKED }).click();
    const dialog = page.getByRole('dialog', { name: 'Results are locked' });
    await expect(dialog).toContainText('Candidate totals unlock once voting opens.');
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto('/admin/results');
    await expect(page.getByRole('dialog', { name: 'Results are locked' })).toBeVisible();
    await expect(page.getByText(/\d+ votes?/)).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();

    expect(resultsCalls).toEqual([]);
    // The API refuses as well, whatever the UI does.
    const direct = await page.request.get('/api/admin/results');
    expect(direct.status()).toBe(409);
    expect(await direct.json()).toMatchObject({ error: { code: 'RESULTS_LOCKED' } });
  });

  test('while voting is open the committee watches the count grow, anonymously', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await adminSignIn(page);
    await page.getByRole('link', { name: 'Results', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/results$/);
    await expect(
      page.getByText('1 vote so far from 139 registered members. Updates live.'),
    ).toBeVisible();

    // A member votes in a booth: the count follows within a few seconds, without a reload.
    await castVote(request);
    await expect(
      page.getByText('2 votes so far from 139 registered members. Updates live.'),
    ).toBeVisible({
      timeout: 6_000,
    });
    // Only totals per candidate: no name of a voter anywhere on the page.
    await expect(page.getByText(/Demo Voter|voter@bcc\.test/)).toHaveCount(0);

    // The display and the export still wait for closing.
    await expect(page.getByRole('button', { name: 'Export results (.xlsx)' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show on display: Final results' })).toHaveCount(
      0,
    );
    const exported = await page.request.get('/api/admin/results/export');
    expect(exported.status()).toBe(409);

    // Closing from the Results page keeps it open with the final count.
    await page.getByRole('button', { name: 'Close voting' }).click();
    await page
      .getByRole('dialog', { name: 'Close voting now?' })
      .getByRole('button', { name: 'Close voting' })
      .click();
    await expect(page.getByText('2 votes from 139 registered members.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export results (.xlsx)' })).toBeVisible();
  });
});

test.describe('voter list', () => {
  test('search is debounced, kept in the URL and survives a reload', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await adminSignIn(page);
    await page.getByRole('link', { name: 'Voter list' }).click();
    await expect(page.getByText('1 of 139 members have voted.')).toBeVisible();
    await expect(page.getByText('Showing 1–6 of 139')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(7);

    const calls = trackRequests(page, '/api/admin/voters');
    await page.getByRole('searchbox').pressSequentially('member00', { delay: 30 });
    await expect(page).toHaveURL(/\/admin\/voters\?q=member00$/);
    await expect(page.getByText('Showing 1–6 of 9')).toBeVisible();
    // One request for the finished word, not one per key.
    expect(calls.filter((url) => url.includes('q=mem') && !url.includes('q=member00'))).toEqual([]);

    await page.reload();
    await expect(page.getByRole('searchbox')).toHaveValue('member00');
    await expect(page.getByText('Showing 1–6 of 9')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/\/admin\/voters\?q=member00&page=2$/);
    await expect(page.getByText('Showing 7–9 of 9')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await page.goBack();
    await expect(page.getByText('Showing 1–6 of 9')).toBeVisible();
  });

  test('no results, then Clear search', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await adminSignIn(page);
    await page.goto('/admin/voters');
    await page.getByRole('searchbox').fill('member999');
    await expect(
      page.getByRole('heading', { name: 'No member matches "member999"' }),
    ).toBeVisible();
    await expect(page.getByText('0 results')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page).toHaveURL(/\/admin\/voters$/);
    await expect(page.getByRole('searchbox')).toHaveValue('');
    await expect(page.getByText('Showing 1–6 of 139')).toBeVisible();
  });

  test('pages through 1,000 voters and shows only voted / not voted', async ({ page, request }) => {
    await applyScenario(request, 'closed', { voterCount: 1000 });
    await adminSignIn(page);
    await page.goto('/admin/voters?page=167');
    await expect(page.getByText('Final list. 800 of 1,000 members voted.')).toBeVisible();
    await expect(page.getByText('Showing 997–1,000 of 1,000')).toBeVisible();
    await expect(page.getByText('167 / 167')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page).toHaveURL(/\/admin\/voters\?page=166$/);
    await expect(page.getByRole('table')).not.toContainText(/candidate/i);
    // A page beyond the end is corrected.
    await page.goto('/admin/voters?page=9999');
    await expect(page).toHaveURL(/\/admin\/voters\?page=167$/);
  });

  test.afterEach(async ({ request }) => {
    // Data options stick to the shared mock database: put the default register back.
    await applyScenario(request, 'not-started', { voterCount: 139 });
  });
});

test.describe('results and display control', () => {
  test('totals appear on the display only after "Show on display"', async ({ page, request }) => {
    await applyScenario(request, 'closed');
    await adminSignIn(page);
    await page.getByRole('link', { name: 'Results', exact: true }).click();
    const rows = page.getByRole('list', { name: 'Results by candidate' }).getByRole('listitem');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Candidate Name 01');
    await expect(rows.nth(0)).toContainText('62 votes');
    await expect(rows.nth(0)).toContainText('55.9%');
    await expect(rows.nth(1)).toContainText('29.7%');
    await expect(rows.nth(2)).toContainText('14.4%');
    await expect(page.getByText(/^Shares are based on 111 valid votes\./)).toBeVisible();

    // Closing put "Voting closed" on air: the public payload has no candidate totals yet.
    const before = await screenOnAir(request);
    expect(before.screen).toBe('voting_closed');
    expect(before).not.toHaveProperty('candidates');
    expect(before).not.toHaveProperty('results');

    await page.getByRole('button', { name: 'Show on display: The winner is…' }).click();
    // The row switches at once (optimistic); the display follows when the backend confirms.
    await expect(displayRow(page, 'WINNER_REVEAL')).toContainText('On screen');
    await expect.poll(async () => (await screenOnAir(request)).screen).toBe('winner_suspense');
    // The line-up only: no votes before the result.
    const reveal = (await screenOnAir(request)) as { candidates: Record<string, unknown>[] };
    expect(reveal.candidates.map((c) => c.ballot_number)).toEqual([1, 2, 3]);
    expect(JSON.stringify(reveal)).not.toMatch(/"votes"/);

    await page.getByRole('button', { name: 'Show on display: Final results' }).click();
    await expect(displayRow(page, 'FINAL_RESULTS')).toContainText('On screen');
    await expect(displayRow(page, 'WINNER_REVEAL')).not.toContainText('On screen');
    await expect.poll(async () => (await screenOnAir(request)).screen).toBe('final_results');
    const final = (await screenOnAir(request)) as { results: { votes: number }[] };
    expect(final.results.map((c) => c.votes)).toEqual([62, 33, 16]);

    // The overview shows the same control and state.
    await page.getByRole('link', { name: 'Overview' }).click();
    await expect(displayRow(page, 'FINAL_RESULTS')).toContainText('On screen');
  });

  test('a display change by another committee member shows up here', async ({ page, request }) => {
    await applyScenario(request, 'closed');
    await adminSignIn(page);
    await expect(displayRow(page, 'VOTING_CLOSED')).toContainText('On screen');
    // The API keeps no display version: the last choice wins and every panel follows the poll.
    await showOnDisplay(request, 'MOST_VOTES');
    await expect(displayRow(page, 'MOST_VOTES')).toContainText('On screen', { timeout: 6_000 });
    await page.getByRole('button', { name: 'Show on display: Final results' }).click();
    await expect(displayRow(page, 'FINAL_RESULTS')).toContainText('On screen');
    await expect.poll(async () => (await screenOnAir(request)).screen).toBe('final_results');
  });

  test('reopening from Results stays on Results and switches to the live count', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'closed');
    await adminSignIn(page);
    await page.goto('/admin/results');
    await page.getByRole('button', { name: 'Reopen voting' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reopen voting?' });
    await expect(dialog).toContainText('The 111 votes already submitted are kept');
    await expect(dialog).toContainText("28 members haven't voted yet");
    await dialog.getByRole('button', { name: 'Reopen voting' }).click();

    await expect(page).toHaveURL(/\/admin\/results$/);
    await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByText('111 votes so far from 139 registered members. Updates live.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export results (.xlsx)' })).toHaveCount(0);
    await expect(displayRow(page, 'VOTING_OPEN')).toContainText('On screen');
    const state = await getMockState(request);
    expect(state.status).toBe('open');
    expect(state.votesReceived).toBe(111);
  });

  test('tie and zero votes', async ({ page, request }) => {
    await applyScenario(request, 'tie');
    await adminSignIn(page);
    await page.goto('/admin/results');
    const leading = page.locator('li[data-leading]');
    await expect(leading).toHaveCount(2);
    await expect(leading.first()).toContainText('Tied for most votes');

    await applyScenario(request, 'zero-votes');
    await adminSignIn(page);
    await page.goto('/admin/results');
    await expect(page.getByText('0 votes from 139 registered members.')).toBeVisible();
    await expect(page.locator('li[data-leading]')).toHaveCount(0);
    await expect(
      page.getByRole('list', { name: 'Results by candidate' }).getByText('0.0%'),
    ).toHaveCount(3);
  });
});
