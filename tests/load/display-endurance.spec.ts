/**
 * Endurance (spec §10): /display must run for more than 4 hours without a reload.
 * Four hours are simulated with Playwright's clock on the polling path (stream refused), with
 * turnout changing on every poll and the committee switching screens every few minutes.
 * Checks: the page follows to the end, never shows "Reconnecting…", and heap, DOM nodes and
 * event listeners do not grow.
 */
import { expect, test, type Page } from '../fixtures';
import { lowest, pageMetrics, type PageMetrics } from './metrics';

const HOURS = 4;
const POLL_MS = 3_000;
const POLLS = (HOURS * 60 * 60 * 1000) / POLL_MS;
/** The committee changes the screen every 100 polls (5 minutes). */
const POLLS_PER_SCREEN = 100;
const SCREENS = ['voting_open', 'voting_closed', 'winner_suspense', 'final_results', 'most_votes'];
const CYCLE = POLLS_PER_SCREEN * SCREENS.length;
/** Polls into a cycle at which it is sampled: halfway through its first screen (voting_open). */
const SAMPLE_AT = POLLS_PER_SCREEN / 2;
/** Samples compared at each end of the run (see lowest). */
const SAMPLE_WINDOW = 3;
const REGISTERED = 139;
const MAX_HEAP_GROWTH_MB = 5;
const MAX_NODE_GROWTH = 200;
const MAX_LISTENER_GROWTH = 30;

test.skip(({ browserName }) => browserName !== 'chromium', 'Heap metrics need Chromium');
test.setTimeout(15 * 60_000);
test.use({ viewport: { width: 1920, height: 1080 } });

/** Payload for poll number `n` (backend wire format): votes grow, the screen changes every POLLS_PER_SCREEN polls. */
function payload(n: number) {
  const screen = SCREENS[Math.floor(n / POLLS_PER_SCREEN) % SCREENS.length] ?? 'voting_open';
  const votes = Math.min(REGISTERED, n % REGISTERED);
  const turnout = {
    registered: REGISTERED,
    voted: votes,
    not_voted: REGISTERED - votes,
    percent: Math.round((votes / REGISTERED) * 1000) / 10,
  };
  const status = screen === 'voting_open' ? 'open' : 'closed';
  const lineup = [1, 2, 3].map((number) => ({
    id: number,
    ballot_number: number,
    full_name: `Candidate Name 0${String(number)}`,
    study_program: 'Informatics Engineering',
    class_year: 2023,
    photo_url: null,
  }));
  const results = [0.55, 0.3, 0.15].map((share, i) => ({
    ...lineup[i],
    votes: Math.round(votes * share),
    share: share * 100,
    rank: i + 1,
  }));
  const common = { screen, status, turnout };
  switch (screen) {
    case 'winner_suspense':
      return { ...common, total_votes: votes, candidates: lineup };
    case 'final_results':
      return { ...common, total_votes: votes, top_tied: false, results };
    case 'most_votes':
      return { ...common, total_votes: votes, top_tied: false, winners: results.slice(0, 1) };
    default:
      return common;
  }
}

/** Runs the clock poll by poll until the page has been served `target` payloads. */
async function advanceTo(page: Page, served: () => number, target: number) {
  while (served() < target) {
    await page.clock.runFor(POLL_MS);
    // Let the fetch answer settle so the next poll is scheduled.
    await page.waitForTimeout(5);
  }
}

test(`runs ${String(HOURS)} hours (simulated) without a reload or a leak`, async ({
  page,
  context,
}) => {
  let polls = 0;
  await page.clock.install();
  await page.route('**/api/display/stream', (route) =>
    route.fulfill({ status: 404, body: '{"error":{"code":"NOT_FOUND"}}' }),
  );
  await page.route('**/api/display', (route) => {
    const body = JSON.stringify(payload(polls));
    polls += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });

  await page.goto('/display');
  await expect(page.locator('[data-screen]')).toHaveCount(1);
  await page.evaluate(() => {
    (window as unknown as { __loadedOnce: boolean }).__loadedOnce = true;
  });

  // A sample halfway through the first screen of every cycle, after a warm-up cycle: always the
  // same screen, long after its cross-fade. Run until the last sample is past the 4 hours.
  const samples: PageMetrics[] = [];
  for (let cycle = 1; polls < POLLS; cycle += 1) {
    await advanceTo(page, () => polls, cycle * CYCLE + SAMPLE_AT + 1);
    await expect(page.locator('[data-screen]')).toHaveAttribute('data-screen', 'VOTING_OPEN');
    await expect(page.locator('[inert]')).toHaveCount(0);
    samples.push(await pageMetrics(context, page));
  }
  // The first cycles against the last ones (see lowest): a leak grows with every poll.
  const start = lowest(samples.slice(0, SAMPLE_WINDOW));
  const end = lowest(samples.slice(-SAMPLE_WINDOW));

  expect(polls).toBeGreaterThanOrEqual(POLLS);
  // data-screen uses the app's names for the screens.
  const domain: Record<string, string> = {
    voting_open: 'VOTING_OPEN',
    voting_closed: 'VOTING_CLOSED',
    winner_suspense: 'WINNER_REVEAL',
    final_results: 'FINAL_RESULTS',
    most_votes: 'MOST_VOTES',
  };
  const expected = domain[payload(polls - 1).screen] ?? '';
  await expect(page.locator('[data-screen]')).toHaveAttribute('data-screen', expected);
  await expect(page.getByTestId('display-reconnecting')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { __loadedOnce?: boolean }).__loadedOnce),
  ).toBe(true);

  test.info().annotations.push({
    type: 'display 4 h',
    description: `${String(polls)} polls; heap ${start.heapMb.toFixed(1)} → ${end.heapMb.toFixed(1)} MB, nodes ${String(start.nodes)} → ${String(end.nodes)}, listeners ${String(start.listeners)} → ${String(end.listeners)}`,
  });
  expect(end.heapMb - start.heapMb).toBeLessThan(MAX_HEAP_GROWTH_MB);
  expect(end.nodes - start.nodes).toBeLessThan(MAX_NODE_GROWTH);
  expect(end.listeners - start.listeners).toBeLessThan(MAX_LISTENER_GROWTH);
});
