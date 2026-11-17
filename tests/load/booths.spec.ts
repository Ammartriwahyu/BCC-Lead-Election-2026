/**
 * Load (spec §10 "Beban & ketahanan").
 * 1. Three booth devices sign every member of the register in turn and vote through the real UI,
 *    in parallel, until all 139 members have voted: every vote counted exactly once, totals match.
 * 2. One booth device serves many voters without a reload: heap, DOM nodes and event listeners
 *    stay flat (measured alone, because Chromium's counters are per renderer process and the
 *    parallel booths may share one).
 */
import { adminSignIn, statValue } from '../e2e/admin-helpers';
import { applyScenario, getMockState } from '../e2e/helpers';
import { reviewButton, signIn, submitVoteButton } from '../e2e/voter-helpers';
import { expect, test, type Page } from '../fixtures';
import { pageMetrics } from './metrics';

const BOOTHS = 3;
const REGISTERED = 139;
const PASSWORD = 'pilketum2026';
const DESKTOP = { width: 1512, height: 982 };
/** Single-booth leak check: warm up, then serve this many more voters. */
const WARM_UP_VOTERS = 3;
const MEASURED_VOTERS = 20;
const MAX_HEAP_GROWTH_MB = 2;
const MAX_NODE_GROWTH = 50;
const MAX_LISTENER_GROWTH = 10;

test.skip(({ browserName }) => browserName !== 'chromium', 'Heap metrics need Chromium');
test.setTimeout(10 * 60_000);

/**
 * Everyone on the register who has not voted yet and signs in without a code: the two demo voters
 * and members 001–135 by NIM (some register rows have no email). The 2FA demo account is left out.
 */
function voters(): string[] {
  const generated = Array.from(
    { length: REGISTERED - 4 },
    (_, i) => `23515020${String(i + 1).padStart(7, '0')}`,
  );
  return ['voter@bcc.test', 'voter2@bcc.test', ...generated];
}

/** One voter at a booth: sign in, pick, confirm, submit, sign out (no 3 s wait). */
async function boothVote(page: Page, email: string, pick: number): Promise<void> {
  await signIn(page, { username: email, password: PASSWORD });
  await expect(page).toHaveURL(/\/candidates$/);
  // A voter sees the ballot photos before choosing. Leaving while they still load keeps the
  // image elements alive until the requests finish, which would read as a leak here.
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('main img[alt^="Photo of"]')]
      .filter((img) => img.offsetParent !== null)
      .every((img) => img.complete),
  );
  await page.getByRole('button', { name: `Select Candidate Name 0${String(pick)}` }).click();
  await reviewButton(page).click();
  await submitVoteButton(page).click();
  await expect(page).toHaveURL(/\/vote\/submitted$/);
  await page.getByRole('main').getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in/);
}

test('3 booths in parallel: all 139 members vote, every vote counted once', async ({
  browser,
  request,
}) => {
  await applyScenario(request, 'open');
  const queue = voters();
  const perBooth = Array.from({ length: BOOTHS }, (_, booth) =>
    queue.filter((_, i) => i % BOOTHS === booth),
  );

  const started = Date.now();
  await Promise.all(
    perBooth.map(async (emails, booth) => {
      const context = await browser.newContext({ viewport: DESKTOP });
      const page = await context.newPage();
      for (const [index, email] of emails.entries()) {
        await boothVote(page, email, ((booth + index) % 3) + 1);
      }
      await context.close();
    }),
  );
  test.info().annotations.push({
    type: 'load',
    description: `${String(REGISTERED - 2)} votes through the UI on ${String(BOOTHS)} booths in ${String(Math.round((Date.now() - started) / 1000))} s`,
  });

  const state = await getMockState(request);
  expect(state.registeredVoters).toBe(REGISTERED);
  // Everyone but the 2FA demo account (voted@ voted before).
  expect(state.votesReceived).toBe(REGISTERED - 1);
  // One request per vote: no retries, no double submits (voted@bcc.test voted in the fixtures).
  expect(state.voteRequests).toBe(REGISTERED - 2);

  // The committee sees the same numbers.
  const panelContext = await browser.newContext({ viewport: DESKTOP });
  const panel = await panelContext.newPage();
  await adminSignIn(panel);
  // 138 of 139: the 2FA demo account does not vote here.
  await expect(statValue(panel, 'Votes received')).toHaveText('138');
  await expect(statValue(panel, 'Not voted yet')).toHaveText('1');
  // "Turnout" is both a stat card and the card below it; the stat card comes first.
  await expect(statValue(panel, 'Turnout').first()).toHaveText('99.3%');
  await panelContext.close();
});

test('one booth serving many voters without a reload does not leak', async ({
  page,
  context,
  request,
}) => {
  // Measured on the test's own page and nothing else: Chromium's counters cover the whole
  // renderer process, so a second page would add its own nodes and listeners.
  await page.setViewportSize(DESKTOP);
  await applyScenario(request, 'open');
  const emails = voters().slice(2, 2 + WARM_UP_VOTERS + MEASURED_VOTERS);

  for (const email of emails.slice(0, WARM_UP_VOTERS)) await boothVote(page, email, 1);
  const start = await pageMetrics(context, page);
  for (const [index, email] of emails.slice(WARM_UP_VOTERS).entries()) {
    await boothVote(page, email, (index % 3) + 1);
  }
  const end = await pageMetrics(context, page);

  test.info().annotations.push({
    type: 'booth memory',
    description: `${String(MEASURED_VOTERS)} voters; heap ${start.heapMb.toFixed(1)} → ${end.heapMb.toFixed(1)} MB, nodes ${String(start.nodes)} → ${String(end.nodes)}, listeners ${String(start.listeners)} → ${String(end.listeners)}`,
  });
  expect(end.heapMb - start.heapMb, 'heap growth (MB)').toBeLessThan(MAX_HEAP_GROWTH_MB);
  expect(end.nodes - start.nodes, 'DOM node growth').toBeLessThan(MAX_NODE_GROWTH);
  expect(end.listeners - start.listeners, 'listener growth').toBeLessThan(MAX_LISTENER_GROWTH);
});
