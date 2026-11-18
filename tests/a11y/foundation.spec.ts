/**
 * Phase 2: foundation pages (404) and the component gallery.
 * axe (no serious/critical), no horizontal scroll, keyboard focus return.
 */
import AxeBuilder from '@axe-core/playwright';

import { expect, test, type Page } from '../fixtures';

const WIDTHS = [360, 390, 768, 1024, 1280, 1512] as const;

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test.describe('404 page', () => {
  for (const width of WIDTHS) {
    test(`renders without horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto('/this-page-does-not-exist');
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('has no serious axe violations', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('links back to sign in', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });
});

test.describe('component gallery (mock builds only)', () => {
  test('has no serious axe violations', async ({ page }) => {
    await page.goto('/dev/gallery');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('dialog returns focus to its trigger after Escape', async ({ page }) => {
    await page.goto('/dev/gallery');
    const trigger = page.getByRole('button', { name: 'Open dialog' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Vote for Candidate Name 01?' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
