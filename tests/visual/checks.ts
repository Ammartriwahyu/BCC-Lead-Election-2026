/**
 * Checks shared by the visual specs (spec §10 "Visual & responsif" and "Aksesibilitas"):
 * no scrollbars, no clipped text, Brace never on top of text, no serious / critical axe issues,
 * plus a screenshot in test-results/visual/ for comparison with Figma.
 */
import AxeBuilder from '@axe-core/playwright';

import { expect, type Page } from '../fixtures';

/** Overlap below this many px (sticker antialiasing, line-height padding) is not "covering". */
const OVERLAP_TOLERANCE_PX = 2;

interface CheckOptions {
  /** Full-page screenshot (scrolling pages). The display is always exactly one screen. */
  fullPage?: boolean;
  /** Also fail on vertical scrolling (display). */
  noVerticalScroll?: boolean;
}

/** Text nodes whose box overlaps a Brace sticker. Returns "text…" descriptions. */
function braceOverText(tolerance: number): string[] {
  const braces = [...document.querySelectorAll<HTMLElement>('[data-brace]')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  if (braces.length === 0) return [];
  const found: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    const parent = node.parentElement;
    if (!text || !parent || parent.closest('[aria-hidden="true"], .sr-only, script, style')) {
      continue;
    }
    const style = getComputedStyle(parent);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      for (const brace of braces) {
        const x = Math.min(rect.right, brace.right) - Math.max(rect.left, brace.left);
        const y = Math.min(rect.bottom, brace.bottom) - Math.max(rect.top, brace.top);
        if (x > tolerance && y > tolerance) found.push(text.slice(0, 40));
      }
    }
  }
  return [...new Set(found)];
}

/**
 * Elements that clip their own text (overflow hidden / ellipsis with more content than room).
 * `data-truncate` marks a one-line preview Figma cuts on purpose (full text in the DOM and on its own page).
 */
function clippedText(): string[] {
  const found: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('body *')) {
    const ownText = [...el.childNodes].some(
      (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
    );
    if (!ownText || el.closest('[aria-hidden="true"], .sr-only, [data-truncate]')) continue;
    const style = getComputedStyle(el);
    const clipsX = /hidden|clip/.test(style.overflowX) || style.textOverflow === 'ellipsis';
    const clipsY = /hidden|clip/.test(style.overflowY);
    if (
      (clipsX && el.scrollWidth > el.clientWidth + 1) ||
      (clipsY && el.scrollHeight > el.clientHeight + 1)
    ) {
      found.push(`${el.tagName.toLowerCase()}: ${el.textContent.trim().slice(0, 40)}`);
    }
  }
  return found;
}

export async function checkScreen(page: Page, name: string, options: CheckOptions = {}) {
  const { fullPage = true, noVerticalScroll = false } = options;
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow.x, `${name}: horizontal scroll`).toBeLessThanOrEqual(0);
  if (noVerticalScroll) expect(overflow.y, `${name}: vertical scroll`).toBeLessThanOrEqual(0);

  expect(
    await page.evaluate(braceOverText, OVERLAP_TOLERANCE_PX),
    `${name}: Brace over text`,
  ).toEqual([]);
  expect(await page.evaluate(clippedText), `${name}: clipped text`).toEqual([]);

  await page.screenshot({ path: `test-results/visual/${name}.png`, fullPage });
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = axe.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious, `${name}: axe`).toEqual([]);
}
