/**
 * Captures D1–D6 and their data variants at 1920×1080 (and the letterboxed 1366×768 laptop) for
 * comparison with Figma. Screenshots land in test-results/visual/. Each screen is also checked
 * with axe (no serious / critical) and for scrollbars.
 */

import { openDisplay, screenOnPage, showOnDisplay } from '../e2e/display-helpers';
import { applyScenario, type Scenario, type ScenarioData } from '../e2e/helpers';
import { expect, test, type Page } from '../fixtures';
import { checkScreen } from './checks';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Visual baseline is captured in Chromium',
);

const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
] as const;

interface Case {
  name: string;
  scenario: Scenario;
  screen: string;
  data?: ScenarioData;
}

const CASES: Case[] = [
  { name: 'D1-opens-soon', scenario: 'not-started', screen: 'OPENS_SOON' },
  { name: 'D2-voting-open', scenario: 'open', screen: 'VOTING_OPEN' },
  { name: 'D5-voting-closed', scenario: 'closed', screen: 'VOTING_CLOSED' },
  { name: 'D6-winner-reveal', scenario: 'closed', screen: 'WINNER_REVEAL' },
  { name: 'D3-final-results', scenario: 'closed', screen: 'FINAL_RESULTS' },
  { name: 'D4-most-votes', scenario: 'closed', screen: 'MOST_VOTES' },
  {
    name: 'D1-six-candidates',
    scenario: 'not-started',
    screen: 'OPENS_SOON',
    data: { candidateSet: 'six' },
  },
  { name: 'D3-tie-six', scenario: 'tie', screen: 'FINAL_RESULTS', data: { candidateSet: 'six' } },
  { name: 'D3-one', scenario: 'closed', screen: 'FINAL_RESULTS', data: { candidateSet: 'one' } },
  {
    name: 'D3-zero-long',
    scenario: 'zero-votes',
    screen: 'FINAL_RESULTS',
    data: { candidateSet: 'long' },
  },
  { name: 'D4-tie', scenario: 'tie', screen: 'MOST_VOTES' },
  { name: 'D4-zero', scenario: 'zero-votes', screen: 'MOST_VOTES' },
  {
    name: 'D4-long-name',
    scenario: 'closed',
    screen: 'MOST_VOTES',
    data: { candidateSet: 'long' },
  },
];

async function check(page: Page, name: string) {
  await page.waitForLoadState('load');
  // Let the 400 ms fade finish and Brace load.
  await page.waitForTimeout(600);
  await checkScreen(page, name, { fullPage: false, noVerticalScroll: true });
}

for (const size of SIZES) {
  test.describe(`display @${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    for (const item of CASES) {
      test(item.name, async ({ page, request }) => {
        await applyScenario(request, item.scenario, item.data);
        await showOnDisplay(request, item.screen);
        await openDisplay(page);
        await expect(screenOnPage(page)).toHaveAttribute('data-screen', item.screen);
        await check(page, `${item.name}-${size.width}`);
      });
    }

    test.afterEach(async ({ request }) => {
      // Data options stick to the shared mock database: put the default set back.
      await applyScenario(request, 'not-started', { candidateSet: 'default' });
    });
  });
}
