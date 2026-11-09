/**
 * Voter flows (spec §4.1–4.3). Runs on desktop Chrome, Pixel 7 and iPhone 14.
 * The mock database is shared, so every test starts by applying a scenario.
 */
import { expect, test } from '@playwright/test';

import { ACCOUNTS, applyScenario, getMockState } from './helpers';
import { committee, reviewButton, signIn, submitVoteButton } from './voter-helpers';

test.describe('happy path', () => {
  test('sign in, pick, review, submit, then booth auto sign-out', async ({ page, request }) => {
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

    // Booth mode: back at sign-in after 10 s, and Back does not reveal the voter's pages.
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
    await expect(page).toHaveURL(/\/candidates\/cand-02$/);
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
    await signIn(page, { email: ACCOUNTS.voter.email, password: 'wrong-password' });
    // Next's route announcer is also role="alert", so target ours by its text.
    await expect(
      page.getByRole('alert').filter({ hasText: "That email and password don't match" }),
    ).toBeVisible();
    const password = page.getByLabel(/^Password/).first();
    await expect(password).toHaveValue('');
    await expect(password).toBeFocused();
  });

  test('not a voter: error on the email field', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page, ACCOUNTS.guest);
    const email = page.getByRole('textbox', { name: 'Email' });
    await expect(email).toHaveAccessibleDescription("This email isn't on the voter register.");
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
  });

  test('already voted goes to "You\'ve already voted"', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await signIn(page, ACCOUNTS.voted);
    await expect(page).toHaveURL(/\/already-voted$/);
    await expect(page.getByRole('heading', { name: "You've already voted" })).toBeVisible();
  });

  test('deep link resumes after sign-in when valid', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.goto('/candidates/cand-03');
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcandidates%2Fcand-03$/);
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates\/cand-03$/);
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
  test('failed submit -> Try again resends with the same Idempotency-Key', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'submit-fails');
    const keys: string[] = [];
    page.on('request', (req) => {
      if (req.url().endsWith('/api/votes') && req.method() === 'POST')
        keys.push(req.headers()['idempotency-key'] ?? '');
    });
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 02' }).click();
    await reviewButton(page).click();
    await submitVoteButton(page).click();
    await expect(page).toHaveURL(/\/vote\/error$/);
    await expect(page.getByRole('heading', { name: "Your vote didn't go through" })).toBeVisible();

    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page).toHaveURL(/\/vote\/submitted$/);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
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
