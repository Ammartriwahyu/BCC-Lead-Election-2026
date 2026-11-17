/**
 * Public display (/display, spec §5 and Design notes "Display screens"): follows the committee live,
 * shows totals only after "Show on display", stream with polling fallback and backoff,
 * scale-to-fit, idle cursor, F for fullscreen. Desktop only.
 */
import { expect, test } from '../fixtures';
import { castVote } from './admin-helpers';
import { openDisplay, screenOnPage, showOnDisplay } from './display-helpers';
import { ACCOUNTS, applyScenario } from './helpers';
import { committee } from './voter-helpers';

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe('live updates', () => {
  test('follows the committee from "opens soon" to the results without a reload', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'not-started');
    const streamResponse = page.waitForResponse('**/api/display/stream');
    await openDisplay(page);
    expect((await streamResponse).headers()['content-type']).toMatch(/^text\/event-stream/);
    await expect(screenOnPage(page)).toHaveAttribute('data-screen', 'OPENS_SOON');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Voting opens soon');

    await committee(request, 'open');
    await expect(screenOnPage(page)).toHaveAttribute('data-screen', 'VOTING_OPEN', {
      timeout: 5_000,
    });
    await expect(page.getByText('1 of 139 members have voted')).toBeVisible();

    await committee(request, 'close');
    await expect(screenOnPage(page)).toHaveAttribute('data-screen', 'VOTING_CLOSED', {
      timeout: 5_000,
    });
    // Closing switches the display automatically; no totals per candidate yet.
    await expect(page.getByText(/Candidate Name/)).toHaveCount(0);

    await showOnDisplay(request, 'WINNER_REVEAL');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The most votes go to…', {
      timeout: 5_000,
    });
    await expect(page.getByText(/Candidate Name|%/)).toHaveCount(0);

    await showOnDisplay(request, 'FINAL_RESULTS');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Final results', {
      timeout: 5_000,
    });
    await expect(page.locator('li[data-leading]')).toContainText('Candidate Name 01');

    await showOnDisplay(request, 'MOST_VOTES');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Candidate Name 01', {
      timeout: 5_000,
    });
    // The URL never changed and the page was never reloaded.
    await expect(page).toHaveURL(/\/display$/);
  });

  test('turnout updates while voting is open', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await openDisplay(page);
    await expect(page.getByText('1 of 139 members have voted')).toBeVisible();
    await castVote(request, ACCOUNTS.voter, '2');
    await expect(page.getByText('2 of 139 members have voted')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('1.4%');
  });

  test('the public payload never carries hidden totals', async ({ request }) => {
    await applyScenario(request, 'open');
    const open = (await (await request.get('/api/display')).json()) as Record<string, unknown>;
    expect(Object.keys(open).sort()).toEqual(['screen', 'status', 'turnout']);

    await applyScenario(request, 'closed');
    await showOnDisplay(request, 'WINNER_REVEAL');
    const reveal = (await (await request.get('/api/display')).json()) as {
      candidates: Record<string, unknown>[];
    };
    // The line-up only (backend doc): names and photos, never a vote count.
    expect(reveal.candidates.map((c) => c.ballot_number)).toEqual([1, 2, 3]);
    expect(JSON.stringify(reveal)).not.toMatch(/"votes"|"share"|"rank"/);
  });
});

test.describe('connection', () => {
  test('falls back to polling every 3 s when there is no stream', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.route('**/api/display/stream', (route) =>
      route.fulfill({ status: 404, body: '{"error":{"code":"NOT_FOUND"}}' }),
    );
    const polls: number[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname === '/api/display') polls.push(Date.now());
    });
    await openDisplay(page);
    await expect(screenOnPage(page)).toHaveAttribute('data-screen', 'VOTING_OPEN');
    await committee(request, 'close');
    await expect(screenOnPage(page)).toHaveAttribute('data-screen', 'VOTING_CLOSED', {
      timeout: 6_000,
    });
    expect(polls.length).toBeGreaterThanOrEqual(2);
    const gaps = polls.slice(1).map((t, i) => t - (polls[i] ?? t));
    gaps.forEach((gap) => {
      expect(gap).toBeGreaterThan(2_500);
    });
  });

  test('backs off, shows "Reconnecting…" after 30 s, keeps the last screen and recovers', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await page.clock.install();
    await page.route('**/api/display/stream', (route) => route.abort());
    await openDisplay(page);
    await expect(screenOnPage(page)).toHaveAttribute('data-screen', 'VOTING_OPEN');

    // The server goes away.
    let polls = 0;
    await page.route('**/api/display', (route) => {
      polls += 1;
      return route.abort();
    });
    // Step the clock so each failed request can settle and schedule the next retry.
    const advance = async (seconds: number) => {
      for (let i = 0; i < seconds; i += 1) {
        await page.clock.runFor(1_000);
        await page.waitForTimeout(25);
      }
    };
    await advance(29);
    const pollsBefore30s = polls;
    // Backoff 1 + 2 + 4 + 8 + 16 s: about five attempts in the first 30 s, not ten.
    expect(pollsBefore30s).toBeGreaterThanOrEqual(4);
    expect(pollsBefore30s).toBeLessThanOrEqual(6);
    await expect(page.getByTestId('display-reconnecting')).toHaveCount(0);
    await advance(5);
    await expect(page.getByTestId('display-reconnecting')).toHaveText('Reconnecting…');
    // The last screen stays up.
    await expect(screenOnPage(page)).toHaveAttribute('data-screen', 'VOTING_OPEN');

    await page.unroute('**/api/display');
    await advance(31);
    await expect(page.getByTestId('display-reconnecting')).toHaveCount(0);
  });
});

test.describe('videotron behaviour', () => {
  test('scales the 1920×1080 stage to fit, without scrolling', async ({ page, request }) => {
    await applyScenario(request, 'not-started');
    await openDisplay(page);
    const box = () =>
      page.getByTestId('display-stage').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
    expect(await box()).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080 });

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect.poll(box).toMatchObject({ x: 0, y: 40, width: 1280, height: 720 });
    await page.setViewportSize({ width: 1024, height: 1024 });
    await expect.poll(box).toMatchObject({ x: 0, width: 1024, height: 576 });
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - innerWidth,
      y: document.documentElement.scrollHeight - innerHeight,
    }));
    expect(overflow).toEqual({ x: 0, y: 0 });
  });

  test('hides the cursor when idle and F toggles fullscreen', async ({ page, request }) => {
    await applyScenario(request, 'not-started');
    await page.clock.install();
    await openDisplay(page);
    const cursor = () => page.locator('main').evaluate((el) => getComputedStyle(el).cursor);
    await page.mouse.move(400, 400);
    expect(await cursor()).not.toBe('none');
    await page.clock.runFor(3_100);
    await expect.poll(cursor).toBe('none');
    await page.mouse.move(500, 500);
    await expect.poll(cursor).not.toBe('none');

    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  });

  test('has no buttons, links or sign-in', async ({ page, request }) => {
    await applyScenario(request, 'closed');
    await openDisplay(page);
    await expect(page.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('link')).toHaveCount(0);
    await expect(page).toHaveURL(/\/display$/);
  });
});
