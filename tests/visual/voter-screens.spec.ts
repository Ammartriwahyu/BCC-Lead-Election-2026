/**
 * Captures every voter screen at the spec widths for side-by-side comparison with Figma
 * (spec §10 "Visual & responsif"). Screenshots land in test-results/visual/.
 * Also asserts: no horizontal scroll and no serious axe violations on each screen.
 */

import { applyScenario } from '../e2e/helpers';
import { reviewButton, signIn } from '../e2e/voter-helpers';
import { expect, test, type Page } from '../fixtures';
import { checkScreen } from './checks';

const WIDTHS = [360, 390, 768, 1024, 1280, 1512] as const;
const HEIGHT = 900;

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Visual baseline is captured in Chromium',
);

function check(page: Page, name: string, width: number) {
  return checkScreen(page, `${name}-${width}`);
}

for (const width of WIDTHS) {
  test.describe(`voter screens @${width}`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test('sign in (open, error)', async ({ page, request }) => {
      await applyScenario(request, 'open');
      await page.goto('/sign-in');
      await expect(page.getByTestId('election-status')).toBeVisible();
      await check(page, 'V0b-sign-in-open', width);
      await signIn(page, { username: 'voter@bcc.test', password: 'nope' });
      await expect(page.getByRole('alert').filter({ hasText: 'match' })).toBeVisible();
      await check(page, 'V0d-sign-in-error', width);
      // Two-step verification (no Figma frame, DEVIATIONS).
      await signIn(page, { username: 'otp@bcc.test', password: 'pilketum2026' });
      await expect(
        page.getByRole('heading', { name: 'Enter your verification code' }),
      ).toBeVisible();
      await check(page, 'V0e-sign-in-code', width);
    });

    test('candidates not started + vision & mission', async ({ page, request }) => {
      await applyScenario(request, 'not-started');
      await signIn(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Voting hasn't opened yet");
      await check(page, 'V1-candidates-not-started', width);
      await page.goto('/candidates/1');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Candidate Name 01');
      await check(page, 'V1-vision-mission-not-started', width);
    });

    test('candidates open, selected, confirm, vision & mission', async ({ page, request }) => {
      await applyScenario(request, 'open');
      await signIn(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Pick your next chairperson',
      );
      await check(page, 'V2-choose', width);
      await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
      await check(page, 'V2-selected', width);
      await reviewButton(page).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/visual/O-confirm-${width}.png` });
      await page.keyboard.press('Escape');
      await page.goto('/candidates/1');
      await check(page, 'V3-vision-mission', width);
    });

    test('status screens', async ({ page, request }) => {
      // Four screens (V4, V5, V6, V5b), each with axe, a full-page screenshot and its entrance
      // animations settled: longer than the default 30 s on narrow widths.
      test.slow();
      await applyScenario(request, 'submit-fails');
      await signIn(page);
      await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
      await reviewButton(page).click();
      await page.getByRole('button', { name: 'Submit vote' }).click();
      await expect(page).toHaveURL(/\/vote\/error$/);
      await check(page, 'V4-vote-error', width);
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page).toHaveURL(/\/vote\/submitted$/);
      await check(page, 'V5-submitted', width);

      await applyScenario(request, 'closed');
      await signIn(page);
      await expect(page).toHaveURL(/\/closed$/);
      await check(page, 'V6-closed', width);

      await applyScenario(request, 'open');
      await page.goto('/sign-in');
      await signIn(page, { username: 'voted@bcc.test', password: 'pilketum2026' });
      await expect(page).toHaveURL(/\/already-voted$/);
      await check(page, 'V5b-already-voted', width);
    });
  });
}
