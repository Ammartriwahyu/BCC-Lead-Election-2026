/**
 * Captures every committee screen (A0–A5 and the dialogs) at the desktop widths for comparison
 * with Figma. Screenshots land in test-results/visual/. Also asserts no horizontal scroll and
 * no serious axe violations on each screen. Admin is desktop only (≥ 1024 px).
 */

import { adminSignIn } from '../e2e/admin-helpers';
import { applyScenario } from '../e2e/helpers';
import { expect, test, type Page } from '../fixtures';
import { checkScreen } from './checks';

/** Admin is designed for ≥ 1024 px; narrower widths use the drawer (DEVIATIONS #13). */
const WIDTHS = [360, 390, 768, 1024, 1280, 1512] as const;
const DESKTOP_MIN = 1024;
const HEIGHT = 982;

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Visual baseline is captured in Chromium',
);

function check(page: Page, name: string, width: number) {
  return checkScreen(page, `${name}-${width}`);
}

async function overviewReady(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Voting status' })).toBeVisible();
}

for (const width of WIDTHS) {
  test.describe(`admin screens @${width}`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test('A0 sign in and error', async ({ page, request }) => {
      await applyScenario(request, 'not-started');
      await page.goto('/admin/sign-in');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in as committee');
      await check(page, 'A0-sign-in', width);
      await page.getByRole('textbox', { name: 'Username' }).fill('committee');
      await page
        .getByLabel(/^Password/)
        .first()
        .fill('nope');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'match' })).toBeVisible();
      await check(page, 'A0-sign-in-error', width);
    });

    test('A1 overview not started, open dialog, voter list', async ({ page, request }) => {
      await applyScenario(request, 'not-started');
      await adminSignIn(page);
      await overviewReady(page);
      await check(page, 'A1-overview-not-started', width);
      await page.getByRole('button', { name: 'Open voting now' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400);
      await check(page, 'O-open-voting', width);
      await page.keyboard.press('Escape');
      await page.goto('/admin/voters');
      await expect(page.getByRole('table')).toBeVisible();
      await check(page, 'A5-voters-not-started', width);
    });

    test('A2 overview open, close dialog, results locked, voter list states', async ({
      page,
      request,
    }) => {
      await applyScenario(request, 'open');
      await adminSignIn(page);
      await overviewReady(page);
      await check(page, 'A2-overview-open', width);
      await page.getByRole('button', { name: 'Close voting' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400);
      await check(page, 'O-close-voting', width);
      await page.keyboard.press('Escape');
      // Below 1024 px the sidebar lives in the drawer (DEVIATIONS #13).
      if (width < DESKTOP_MIN) await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('button', { name: /^Results\s*, locked/ }).click();
      await expect(page.getByRole('dialog', { name: 'Results are locked' })).toBeVisible();
      await page.waitForTimeout(400);
      await check(page, 'O-results-locked', width);
      await page.keyboard.press('Escape');

      await page.goto('/admin/voters');
      await expect(page.getByRole('table')).toBeVisible();
      await check(page, 'A5-voters-open', width);
      await page.goto('/admin/voters?page=24');
      await expect(page.getByText('Showing 139–139 of 139')).toBeVisible();
      await check(page, 'A5-voters-open-last-page', width);
      await page.goto('/admin/voters?q=member999');
      await expect(page.getByRole('heading', { name: /^No member matches/ })).toBeVisible();
      await check(page, 'A5-voters-open-no-results', width);
    });

    test('A3 overview closed, A4 results, reopen dialog, display on Final results', async ({
      page,
      request,
    }) => {
      await applyScenario(request, 'closed');
      await adminSignIn(page);
      await overviewReady(page);
      await expect(page.getByTestId('display-row-FINAL_RESULTS')).toContainText('62 · 33 · 16');
      await check(page, 'A3-overview-closed', width);
      await page.goto('/admin/voters');
      await expect(page.getByRole('table')).toBeVisible();
      await check(page, 'A5-voters-closed', width);

      await page.goto('/admin/results');
      await expect(page.getByRole('list', { name: 'Results by candidate' })).toBeVisible();
      await check(page, 'A4-results', width);
      await page.getByRole('button', { name: 'Reopen voting' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400);
      await check(page, 'O-reopen-voting', width);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Show on display: Final results' }).click();
      await expect(page.getByTestId('display-row-FINAL_RESULTS')).toContainText('On screen');
      await check(page, 'A4-results-display-final', width);
    });

    test('A4 results with long names, six candidates and a tie', async ({ page, request }) => {
      await applyScenario(request, 'closed', { candidateSet: 'long' });
      await adminSignIn(page);
      await page.goto('/admin/results');
      await expect(page.getByRole('list', { name: 'Results by candidate' })).toBeVisible();
      await check(page, 'A4-results-long-names', width);

      await applyScenario(request, 'tie', { candidateSet: 'six' });
      await adminSignIn(page);
      await page.goto('/admin/results');
      await expect(page.locator('li[data-leading]')).toHaveCount(2);
      await check(page, 'A4-results-six-tie', width);
    });

    test('A6 candidates (list, empty, locked), A7 add with errors, A8 edit', async ({
      page,
      request,
    }) => {
      // Six screens in one test (two sign-ins, three scenarios).
      test.setTimeout(90_000);
      await applyScenario(request, 'not-started');
      await adminSignIn(page);
      await page.goto('/admin/candidates');
      await expect(
        page.getByRole('list', { name: 'Candidates' }).getByRole('listitem'),
      ).toHaveCount(3);
      await check(page, 'A6-candidates-not-started', width);

      await page.goto('/admin/candidates/1/edit');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Edit Candidate Name 01' }),
      ).toBeVisible();
      await check(page, 'A8-edit-candidate', width);

      await applyScenario(request, 'not-started', { candidateSet: 'none' });
      await adminSignIn(page);
      await page.goto('/admin/candidates');
      await expect(page.getByRole('heading', { name: 'No candidates yet' })).toBeVisible();
      await check(page, 'A6-candidates-empty', width);
      await page.getByRole('link', { name: 'Add candidate' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Add candidate' })).toBeVisible();
      await check(page, 'A7-add-candidate', width);
      await page.getByRole('button', { name: 'Save candidate' }).click();
      await expect(
        page.getByText('6 fields need your attention before you can save.'),
      ).toBeVisible();
      await check(page, 'A7-add-candidate-errors', width);

      await applyScenario(request, 'open');
      await adminSignIn(page);
      await page.goto('/admin/candidates');
      await expect(page.getByText(/locked while voting is open/)).toBeVisible();
      await check(page, 'A6-candidates-open', width);
    });

    test.afterEach(async ({ request }) => {
      // Data options stick to the shared mock database: put the default set back.
      await applyScenario(request, 'not-started', { candidateSet: 'default' });
    });
  });
}
