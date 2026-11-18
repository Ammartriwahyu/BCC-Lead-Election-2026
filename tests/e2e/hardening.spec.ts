/**
 * Hardening checks from spec §10 that are not tied to one flow: keyboard-only use, visible focus,
 * reduced motion, zoom 200 %, phone landscape, extreme candidate data on voter pages,
 * storage and cookies, and polling that stops when its page unmounts.
 */
import { devices } from '@playwright/test';

import { expect, test, type Page } from '../fixtures';
import { adminSignIn } from './admin-helpers';
import { ACCOUNTS, applyScenario, type ScenarioData } from './helpers';
import { reviewButton, signIn } from './voter-helpers';

/** True when the focused element shows a visible outline (the 2 px focus ring). */
async function focusRingVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const target = el.closest('[class*="focus-within"]') ?? el;
    const style = getComputedStyle(el);
    const box = getComputedStyle(target);
    const ring = (s: CSSStyleDeclaration) =>
      s.outlineStyle !== 'none' && Number.parseFloat(s.outlineWidth) >= 2;
    return ring(style) || ring(box);
  });
}

async function tabTo(page: Page, name: RegExp, maxTabs = 40): Promise<void> {
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return '';
      return (
        el.getAttribute('aria-label') ??
        el.getAttribute('placeholder') ??
        (el.textContent || '').trim()
      );
    });
    if (name.test(label)) {
      expect(await focusRingVisible(page), `focus ring on "${label}"`).toBe(true);
      return;
    }
  }
  throw new Error(`Could not reach ${String(name)} with Tab`);
}

async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
}

test.describe('keyboard only', () => {
  test.use({ viewport: { width: 1512, height: 982 } });

  test('a voter can sign in, pick, confirm and submit with the keyboard', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await page.goto('/sign-in');
    await tabTo(page, /^NIM or name@student/);
    await page.keyboard.type(ACCOUNTS.voter.username);
    await page.keyboard.press('Tab');
    await page.keyboard.type(ACCOUNTS.voter.password);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/candidates$/);

    await tabTo(page, /^Select Candidate Name 02$/);
    await page.keyboard.press('Enter');
    await tabTo(page, /^Review and submit$/);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Vote for Candidate Name 02?' });
    await expect(dialog).toBeVisible();
    // Focus is trapped in the dialog; Submit vote is reachable with Tab.
    await tabTo(page, /^Submit vote$/, 6);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/vote\/submitted$/);
    await expect(page.getByRole('heading', { name: 'Thanks, your vote is in' })).toBeVisible();
  });

  test('the committee can open voting with the keyboard', async ({ page, request }) => {
    await applyScenario(request, 'not-started');
    await page.goto('/admin/sign-in');
    await tabTo(page, /^Committee username/);
    await page.keyboard.type(ACCOUNTS.committee.username);
    await page.keyboard.press('Tab');
    await page.keyboard.type(ACCOUNTS.committee.password);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    await tabTo(page, /^Open voting now$/);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Open voting now?' })).toBeVisible();
    await tabTo(page, /^Open voting$/, 6);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
  });
});

test.describe('motion', () => {
  test.use({ viewport: { width: 1512, height: 982 } });

  test('prefers-reduced-motion turns animations off', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await reviewButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const duration = await dialog.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(Number.parseFloat(duration)).toBeLessThan(0.01);
  });
});

test.describe('zoom 200 %', () => {
  // A 1280×800 window at 200 % zoom lays out like a 640×400 viewport.
  test.use({ viewport: { width: 640, height: 400 } });

  test('voter and committee pages reflow without horizontal scrolling', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await page.goto('/sign-in');
    await noHorizontalScroll(page);
    await page.getByRole('button', { name: 'Sign in', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeInViewport();
    await signIn(page);
    await expect(page).toHaveURL(/\/candidates$/);
    await noHorizontalScroll(page);
    await page.getByRole('button', { name: 'Select Candidate Name 03' }).click();
    await reviewButton(page).click();
    const submit = page.getByRole('button', { name: 'Submit vote' });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();

    await adminSignIn(page);
    await noHorizontalScroll(page);
    await page.goto('/admin/voters');
    await expect(page.getByRole('table')).toBeVisible();
    await noHorizontalScroll(page);
  });
});

for (const [name, device] of [
  ['Pixel 7 landscape', devices['Pixel 7 landscape']],
  ['iPhone 14 landscape', devices['iPhone 14 landscape']],
] as const) {
  test.describe(name, () => {
    test.use({
      viewport: device.viewport,
      userAgent: device.userAgent,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });

    test('the voter flow fits a short, wide screen', async ({ page, request }) => {
      await applyScenario(request, 'open');
      await signIn(page);
      await expect(page).toHaveURL(/\/candidates$/);
      await noHorizontalScroll(page);
      await page.getByRole('button', { name: 'Select Candidate Name 03' }).click();
      await reviewButton(page).click();
      const submit = page.getByRole('button', { name: 'Submit vote' });
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
      await submit.click();
      await expect(page).toHaveURL(/\/vote\/submitted$/);
      await noHorizontalScroll(page);
    });
  });
}

test.describe('extreme candidate data on voter pages', () => {
  const cases: [string, ScenarioData, number][] = [
    ['one candidate', { candidateSet: 'one' }, 1],
    ['six candidates', { candidateSet: 'six' }, 6],
    ['very long names', { candidateSet: 'long' }, 3],
  ];
  for (const width of [360, 1512]) {
    for (const [label, data, count] of cases) {
      test(`${label} @${width}`, async ({ page, request }) => {
        await page.setViewportSize({ width, height: 900 });
        await applyScenario(request, 'open', data);
        await signIn(page);
        await expect(page).toHaveURL(/\/candidates$/);
        await expect(page.getByRole('button', { name: /^Select / })).toHaveCount(count);
        await noHorizontalScroll(page);
        // Every name is fully visible (wrapped, never cut).
        const cut = await page.evaluate(() =>
          [...document.querySelectorAll('h3')]
            .filter((h) => h.scrollWidth > h.clientWidth + 1)
            .map((h) => h.textContent),
        );
        expect(cut).toEqual([]);
        // Pick the first candidate (the longest name in the "long" set).
        await page
          .getByRole('button', { name: /^Select / })
          .first()
          .click();
        if (width < 768) {
          // The mobile action bar shows the whole name and never covers the last card.
          await page.evaluate(() => {
            window.scrollTo(0, document.documentElement.scrollHeight);
          });
          const layout = await page.evaluate(() => {
            const bar = [...document.querySelectorAll<HTMLElement>('.fixed.bottom-0')].find((el) =>
              el.textContent.includes('Your pick'),
            );
            const value = bar?.querySelector('p:nth-of-type(2)');
            const buttons = [...document.querySelectorAll('main button')].filter((b) =>
              /^(Select|Selected)/.test(b.textContent.trim()),
            );
            const lastButton = buttons.at(-1)?.getBoundingClientRect();
            return {
              valueClipped: value ? value.scrollWidth > value.clientWidth + 1 : true,
              barTop: bar?.getBoundingClientRect().top ?? 0,
              lastBottom: lastButton?.bottom ?? Number.POSITIVE_INFINITY,
            };
          });
          expect(layout.valueClipped).toBe(false);
          expect(layout.lastBottom).toBeLessThanOrEqual(layout.barTop);
        }
        await expect(reviewButton(page)).toBeEnabled();
        await reviewButton(page).click();
        await expect(page.getByRole('button', { name: 'Submit vote' })).toBeVisible();
      });
    }
  }

  test.afterEach(async ({ request }) => {
    await applyScenario(request, 'not-started', { candidateSet: 'default' });
  });
});

test.describe('storage and cookies', () => {
  test.use({ viewport: { width: 1512, height: 982 } });

  test('no voter or committee data in web storage; session cookies are HttpOnly', async ({
    page,
    context,
    request,
  }) => {
    await applyScenario(request, 'open');
    await signIn(page);
    await page.getByRole('button', { name: 'Select Candidate Name 01' }).click();
    await reviewButton(page).click();
    await page.getByRole('button', { name: 'Submit vote' }).click();
    await expect(page).toHaveURL(/\/vote\/submitted$/);
    await adminSignIn(page);
    await page.goto('/admin/voters');
    await expect(page.getByRole('table')).toBeVisible();

    const storage = await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    }));
    expect(storage).toEqual({ local: 0, session: 0 });
    const cookies = await context.cookies();
    const sessions = cookies.filter((c) => c.name.startsWith('pilketum_'));
    expect(sessions.map((c) => c.name).sort()).toEqual([
      'pilketum_admin_session',
      'pilketum_voter_session',
    ]);
    for (const cookie of sessions) {
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe('Lax');
    }
    // Nothing readable from JavaScript.
    expect(await page.evaluate(() => document.cookie)).not.toContain('pilketum_');
  });
});

test.describe('timers stop when their page unmounts', () => {
  test.use({ viewport: { width: 1512, height: 982 } });

  test('leaving the voter list stops its polling', async ({ page, request }) => {
    await applyScenario(request, 'open');
    await adminSignIn(page);
    await page.goto('/admin/voters');
    await expect(page.getByRole('table')).toBeVisible();
    await page.getByRole('link', { name: 'Overview' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    const polls: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname === '/api/admin/voters') polls.push(r.url());
    });
    await page.waitForTimeout(10_000);
    expect(polls).toEqual([]);
  });

  test('the display closes its stream and stops polling when it unmounts', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'open');
    await page.goto('/display');
    await expect(page.locator('[data-screen]')).toHaveCount(1);
    // Client-side navigation away from /display through the Next router (no full reload), so
    // only React unmounting can stop the stream and the timers.
    await page.evaluate(() => {
      (window as unknown as { __sameDocument: boolean }).__sameDocument = true;
      (
        window as unknown as { next: { router: { push: (href: string) => void } } }
      ).next.router.push('/sign-in');
    });
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'BCC Chairperson Election 2026',
    );
    expect(
      await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument),
    ).toBe(true);
    const after: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname.startsWith('/api/display')) after.push(r.url());
    });
    await page.waitForTimeout(8_000);
    expect(after).toEqual([]);
  });
});
