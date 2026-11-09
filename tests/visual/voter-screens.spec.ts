/**
 * Captures every voter screen at the spec widths for side-by-side comparison with Figma
 * (spec §10 "Visual & responsif"). Screenshots land in test-results/visual/.
 * Also asserts: no horizontal scroll and no serious axe violations on each screen.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { applyScenario } from '../e2e/helpers';
import { reviewButton, signIn } from '../e2e/voter-helpers';

const WIDTHS = [360, 390, 768, 1024, 1280, 1512] as const;
const HEIGHT = 900;

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Visual baseline is captured in Chromium',
);

async function check(page: Page, name: string, width: number) {
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, `${name} @${width}: horizontal scroll`).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `test-results/visual/${name}-${width}.png`, fullPage: true });
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = axe.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious, `${name} @${width}: axe`).toEqual([]);
}

for (const width of WIDTHS) {
  test.describe(`voter screens @${width}`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test('sign in (open, error)', async ({ page, request }) => {
      await applyScenario(request, 'open');
      await page.goto('/sign-in');
      await expect(page.getByTestId('election-status')).toBeVisible();
      await check(page, 'V0b-sign-in-open', width);
      await signIn(page, { email: 'voter@bcc.test', password: 'nope' });
      await expect(page.getByRole('alert').filter({ hasText: 'match' })).toBeVisible();
      await check(page, 'V0d-sign-in-error', width);
    });

    test('candidates not started + vision & mission', async ({ page, request }) => {
      await applyScenario(request, 'not-started');
      await signIn(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Voting hasn't opened yet");
      await check(page, 'V1-candidates-not-started', width);
      await page.goto('/candidates/cand-01');
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
      await page.goto('/candidates/cand-01');
      await check(page, 'V3-vision-mission', width);
    });

    test('status screens', async ({ page, request }) => {
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
      await signIn(page, { email: 'voted@bcc.test', password: 'pilketum2026' });
      await expect(page).toHaveURL(/\/already-voted$/);
      await check(page, 'V5b-already-voted', width);
    });
  });
}
