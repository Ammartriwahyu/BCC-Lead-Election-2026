/**
 * Voter flows (spec §4.1–4.3). Runs on desktop Chrome, Pixel 7 and iPhone 14.
 * The mock database is shared, so every test starts by applying a scenario.
 */
import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';
import { ACCOUNTS, applyScenario, DEMO_OTP_CODE, getMockState } from './helpers';
import { committee, reviewButton, signIn, submitVoteButton } from './voter-helpers';

test.describe('happy path', () => {
  test('sign in, pick, review, submit, then booth auto sign-out @cross-browser', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pick your next chairperson' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Select Candidate Name 02' }).click();
    await expect(page.getByRole('button', { name: 'Selected Candidate Name 02' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Picking another candidate replaces the pick.
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await expect(page.getByRole('button', { name: 'Select Candidate Name 02' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await reviewButton(page).click();
    await expect(page.getByRole('dialog', { name: 'Vote for Candidate Name 01?' })).toBeVisible();
    await submitVoteButton(page).click();

    await expect(page).toHaveURL(/\/vote\/submitted$/);
    await expect(page.getByRole('heading', { name: 'Thanks, your vote is in' })).toBeVisible();
    await expect(
      page.getByText(/^Submitted [A-Z][a-z]{2} \d{1,2}, \d{4} at \d{2}:\d{2} WIB$/),
    ).toBeVisible();
    await expect(page.getByTestId('auto-sign-out')).toContainText(/Signing you out in \d+s/);

    // Booth mode: back at sign-in after 3 s, and Back does not reveal the voter's pages.
    await expect(page).toHaveURL(/\/sign-in\?reason=signed-out$/, { timeout: 15_000 });
    await page.goBack();
    await expect(page).not.toHaveURL(/\/(candidates|vote|already-voted|closed)/);
    const state = await getMockState(request);
    expect(state.votesReceived).toBe(2); // voted@bcc.test + this vote
  });

  test('clicking Selected clears the pick', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 03' }).click();
    await page.getByRole('button', { name: 'Selected Candidate Name 03' }).click();
    await expect(reviewButton(page)).toBeDisabled();
  });

  test('vision & mission: select this candidate returns to the list with it selected', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await page.getByRole('link', { name: 'Vision & mission of Candidate Name 02' }).click();
    await expect(page).toHaveURL(/\/candidates\/2$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Vision' })).toBeVisible();
    await page
      .getByRole('button', { name: 'Select this candidate' })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/candidates$/);
    await expect(page.getByRole('button', { name: 'Selected Candidate Name 02' })).toBeVisible();
  });

  test('unknown candidate shows the BCC 404', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates$/);
    await page.goto('/candidates/nope');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});

test.describe('sign-in errors', () => {
  test('wrong password: banner, password cleared, focus on password', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page, { username: ACCOUNTS.voter.username, password: 'wrong-password' });
    // Next's route announcer is also role="alert", so target ours by its text.
    await expect(
      page.getByRole('alert').filter({ hasText: "That NIM or email and password don't match" }),
    ).toBeVisible();
    const password = page.getByLabel(/^Password/).first();
    await expect(password).toHaveValue('');
    await expect(password).toBeFocused();
  });

  test('not on the register: error on the account field', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page, ACCOUNTS.guest);
    const account = page.getByRole('textbox', { name: 'NIM or UB email' });
    await expect(account).toHaveAccessibleDescription("This account isn't on the voter register.");
    await expect(account).toBeFocused();
    await expect(account).toHaveAttribute('aria-invalid', 'true');
  });

  test('UB SSO not responding: banner, nothing else changes', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page, ACCOUNTS.ssoDown);
    await expect(
      page.getByRole('alert').filter({ hasText: "UB sign-in isn't responding right now" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('signs in with a NIM, and with a code for two-step verification', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await signIn(page, ACCOUNTS.voterNim);
    await expect(page).toHaveURL(/\/candidates$/);
    await page.context().clearCookies();

    await signIn(page, ACCOUNTS.otp);
    await expect(page.getByRole('heading', { name: 'Enter your verification code' })).toBeVisible();
    const code = page.getByRole('textbox', { name: /Verification code/ });
    await expect(code).toBeFocused();
    await code.fill('000000');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(code).toHaveAccessibleDescription("That code isn't right. Try again.");
    await code.fill(DEMO_OTP_CODE);
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveURL(/\/candidates$/);
  });

  test('already voted goes to "You\'ve already voted"', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page, ACCOUNTS.voted);
    await expect(page).toHaveURL(/\/already-voted$/);
    await expect(page.getByRole('heading', { name: "You've already voted" })).toBeVisible();
  });

  test('deep link resumes after sign-in when valid', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.goto('/candidates/3');
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcandidates%2F3$/);
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates\/3$/);
  });
});

test.describe('state changes without reload', () => {
  test('NOT_STARTED is read-only, then switches to voting when the committee opens', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'not-started');
    await signIn(page);
    await expect(
      page.getByRole('heading', { level: 1, name: "Voting hasn't opened yet" }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Select / })).toHaveCount(0);

    await committee(request, 'open');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pick your next chairperson' }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('announcer-polite')).toHaveText(
      'Voting is open. You can now pick a candidate.',
    );
    await expect(page.getByRole('button', { name: 'Select Candidate Name 01' })).toBeVisible();
  });

  test('voting closes while the confirm dialog is open, then reopens', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await reviewButton(page).click();
    await expect(submitVoteButton(page)).toBeVisible();

    await committee(request, 'close');
    await expect(page).toHaveURL(/\/closed$/, { timeout: 10_000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Voting has closed' })).toBeVisible();

    await committee(request, 'reopen');
    await expect(page).toHaveURL(/\/candidates$/, { timeout: 10_000 });
  });

  test('closed mid-submit sends the voter to /closed', async ({ page, request }) => {
    await applyScenario(request, 'closed-mid-vote');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await reviewButton(page).click();
    await submitVoteButton(page).click();
    await expect(page).toHaveURL(/\/closed$/);
  });
});

test.describe('submit failures', () => {
  test('failed submit -> Try again checks has_voted, then resends', async ({ page, request }) => {
    await applyScenario(request, 'submit-fails');
    const calls: string[] = [];
    page.on('request', (req) => {
      const path = new URL(req.url()).pathname;
      if (path === '/api/votes' || path === '/api/me') calls.push(`${req.method()} ${path}`);
    });
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 02' }).click();
    await reviewButton(page).click();
    await submitVoteButton(page).click();
    await expect(page).toHaveURL(/\/vote\/error$/);
    await expect(page.getByRole('heading', { name: "Your vote didn't go through" })).toBeVisible();

    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page).toHaveURL(/\/vote\/submitted$/);
    const votes = calls.filter((c) => c === 'POST /api/votes');
    expect(votes).toHaveLength(2);
    // The status check runs between the two attempts.
    expect(calls.lastIndexOf('GET /api/me')).toBeGreaterThan(calls.indexOf('POST /api/votes'));
    expect((await getMockState(request)).votesReceived).toBe(2);
  });

  test('vote stored but response lost -> status check avoids a second vote', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'submit-lost-response');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await reviewButton(page).click();
    await submitVoteButton(page).click();
    await expect(page).toHaveURL(/\/vote\/error$/);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page).toHaveURL(/\/vote\/submitted$/);
    const state = await getMockState(request);
    expect(state.voteRequests).toBe(1);
    expect(state.votesReceived).toBe(2);
  });

  test('double click on Submit vote sends one request', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await reviewButton(page).click();
    await submitVoteButton(page).dblclick();
    await expect(page).toHaveURL(/\/vote\/submitted$/);
    expect((await getMockState(request)).voteRequests).toBe(1);
  });

  test('Back and reload after submitting never show the vote form', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await reviewButton(page).click();
    await submitVoteButton(page).click();
    await expect(page).toHaveURL(/\/vote\/submitted$/);
    await page.goBack();
    await expect(page).not.toHaveURL(/\/candidates$/);
    await page.goto('/candidates');
    await expect(page).toHaveURL(/\/already-voted$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: "You've already voted" })).toBeVisible();
  });
});

test.describe('session and connectivity', () => {
  test('expired session goes back to sign-in with a message', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates$/);
    // Server forgets the session (e.g. backend restart); the next authenticated call returns 401.
    await applyScenario(request, 'open');
    await page.reload();
    await expect(page).toHaveURL(/\/sign-in\?reason=expired/, { timeout: 10_000 });
    await expect(page.getByRole('status').filter({ hasText: 'Your session ended' })).toBeVisible();
  });

  test('offline blocks submitting until the connection is back', async ({
    page,
    context,
    request,
  }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await reviewButton(page).click();
    await context.setOffline(true);
    await expect(
      page.getByText("You're offline. Your vote will not be sent until you're back online."),
    ).toBeVisible();
    await expect(submitVoteButton(page)).toBeDisabled();
    await context.setOffline(false);
    await expect(submitVoteButton(page)).toBeEnabled();
  });
});

test.describe('booth mode', () => {
  test('idle for 90 s shows "Still there?", then signs out after 30 s', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await page.clock.install();
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates$/);
    await page.clock.fastForward('01:31');
    await expect(page.getByRole('dialog', { name: 'Still there?' })).toBeVisible();
    await page.clock.fastForward('00:31');
    await expect(page).toHaveURL(/\/sign-in\?reason=signed-out$/);
    await page.goBack();
    await expect(page).not.toHaveURL(/\/(candidates|vote|already-voted|closed)/);
  });

  test('"I\'m still here" keeps the voter signed in', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.clock.install();
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates$/);
    await page.clock.fastForward('01:31');
    await page.getByRole('button', { name: "I'm still here" }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/candidates$/);
  });

  test('second voter on the same device sees nothing from the first', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 03' }).click();
    await page.getByRole('button', { name: 'Sign out' }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/sign-in/);
    await signIn(page, ACCOUNTS.voter2);
    await expect(page).toHaveURL(/\/candidates$/);
    await expect(page.getByRole('button', { name: /^Selected / })).toHaveCount(0);
    await expect(reviewButton(page)).toBeDisabled();
  });
});

test.describe('live state: one stream, polling only as a fallback', () => {
  /** Polls of GET /api/election (the stream lives at /api/election/stream). */
  function trackPolls(page: Page) {
    const seen = { polls: 0, streams: 0 };
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path === '/api/election') seen.polls += 1;
      if (path === '/api/election/stream') seen.streams += 1;
    });
    return seen;
  }

  test('the voter pages follow closing over /election/stream without polling', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    const seen = trackPolls(page);
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates$/);
    await expect.poll(() => seen.streams).toBe(1);

    // No polling while the stream is open (11 s would be two polls).
    const before = seen.polls;
    await page.waitForTimeout(11_000);
    expect(seen.polls - before).toBe(0);

    // Pushed by the stream: well under the 5 s poll.
    await committee(request, 'close');
    await expect(page).toHaveURL(/\/closed$/, { timeout: 2_500 });
  });

  test('without the stream the voter pages keep polling', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.route('**/api/election/stream', (route) => route.abort());
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates$/);
    await committee(request, 'close');
    await expect(page).toHaveURL(/\/closed$/, { timeout: 8_000 });
  });
});
