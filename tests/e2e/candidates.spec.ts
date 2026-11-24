/**
 * Committee: candidates (A6–A8, spec 4.4) against the mock backend through the BFF, including a
 * real multipart photo upload. Desktop only, like the rest of the panel.
 */
import { expect, test } from '../fixtures';
import { adminSignIn } from './admin-helpers';
import { applyScenario, getMockState } from './helpers';

/** Smallest valid PNG (1 × 1). */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('candidates', () => {
  test('add a candidate with a photo, then voting can open', async ({ page, request }) => {
    await applyScenario(request, 'not-started', { candidateSet: 'one' });
    await adminSignIn(page);

    // With one candidate, Open voting explains why it cannot open yet.
    await page.getByRole('button', { name: 'Open voting now' }).click();
    const blocked = page.getByRole('dialog', { name: 'Open voting now?' });
    await expect(blocked.getByRole('alert')).toContainText(
      'Voting needs 3 candidates before it can open. There is 1 now.',
    );
    await blocked.getByRole('link', { name: 'Go to candidates' }).click();
    await expect(page).toHaveURL(/\/admin\/candidates$/);

    for (const [name, program] of [
      ['Candidate Name 02', 'Informatics Engineering'],
      ['Candidate Name 03', 'Computer Engineering'],
    ] as const) {
      await page.getByRole('link', { name: 'Add candidate' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Add candidate' })).toBeVisible();
      await page.locator('input[type="file"]').setInputFiles({
        name: 'candidate.png',
        mimeType: 'image/png',
        buffer: PNG,
      });
      await expect(page.getByText('candidate.png')).toBeVisible();
      await page.getByRole('textbox', { name: /Full name/ }).fill(name);
      await page.getByRole('combobox', { name: /Study program/ }).selectOption(program);
      await page.getByRole('combobox', { name: /Class year/ }).selectOption('2024');
      await page.getByRole('textbox', { name: /Vision/ }).fill('Build things together.');
      await page.getByRole('textbox', { name: 'Mission point 1' }).fill('Run monthly classes.');
      await expect(page.getByRole('complementary', { name: 'Preview' })).toContainText(name);
      await page.getByRole('button', { name: 'Save candidate' }).click();
      await expect(page).toHaveURL(/\/admin\/candidates$/);
      // The previous toast may still be on screen (3 s).
      await expect(
        page.getByRole('status').filter({ hasText: 'Candidate added' }).last(),
      ).toBeVisible();
    }

    const rows = page.getByRole('list', { name: 'Candidates' }).getByRole('listitem');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(2)).toContainText('Candidate Name 03');
    await expect(rows.nth(2)).toContainText('Complete');
    await expect(page.getByRole('button', { name: 'Add candidate' })).toBeDisabled();

    // The voter ballot shows the uploaded photo.
    await expect(
      rows.nth(2).getByRole('img', { name: 'Photo of Candidate Name 03' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Overview' }).click();
    await page.getByRole('button', { name: 'Open voting now' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Open voting' }).click();
    await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
    expect((await getMockState(request)).status).toBe('open');

    // From now on the ballot is locked for good.
    await page.getByRole('link', { name: 'Candidates' }).click();
    await expect(page.getByText(/locked while voting is open/)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Edit/ })).toHaveCount(0);
  });

  test('edit, discard and delete', async ({ page, request }) => {
    await applyScenario(request, 'not-started');
    await adminSignIn(page);
    await page.goto('/admin/candidates');
    await page.getByRole('link', { name: 'Edit Candidate Name 03' }).click();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(
      'Election/Candidates/Edit',
    );

    // Leaving with unsaved changes asks first, also through the sidebar.
    await page.getByRole('textbox', { name: /Full name/ }).fill('Changed my mind');
    await page.getByRole('link', { name: 'Voter list' }).click();
    const discard = page.getByRole('dialog', { name: 'Discard this candidate?' });
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Keep editing' }).click();
    await expect(page).toHaveURL(/\/admin\/candidates\/3\/edit$/);

    await page.getByRole('textbox', { name: /Full name/ }).fill('Candidate Three');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Changes saved' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Candidates' })).toContainText('Candidate Three');

    await page.getByRole('link', { name: 'Edit Candidate Three' }).click();
    await page.getByRole('button', { name: 'Delete candidate' }).click();
    await page
      .getByRole('dialog', { name: 'Delete Candidate Three?' })
      .getByRole('button', { name: 'Delete candidate' })
      .click();
    await expect(page.getByRole('status').filter({ hasText: 'Candidate removed' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Candidates' }).getByRole('listitem')).toHaveCount(
      2,
    );
    await expect(page.getByRole('link', { name: 'Add candidate' })).toBeVisible();
  });

  test('a submit with empty fields lists the problems', async ({ page, request }) => {
    await applyScenario(request, 'not-started', { candidateSet: 'none' });
    await adminSignIn(page);
    await page.goto('/admin/candidates');
    await expect(page.getByRole('heading', { name: 'No candidates yet' })).toBeVisible();
    await page.getByRole('link', { name: 'Add candidate' }).click();
    await page.getByRole('button', { name: 'Save candidate' }).click();
    await expect(page.getByRole('alert').first()).toContainText(
      '6 fields need your attention before you can save.',
    );
    await expect(page.getByRole('button', { name: /Photo/ })).toBeFocused();
  });

  test('adjust frames the photo in the browser and saves the cropped JPEG', async ({
    page,
    request,
  }) => {
    await applyScenario(request, 'not-started', { candidateSet: 'one' });
    await adminSignIn(page);
    await page.goto('/admin/candidates/new');
    // A real 400 × 300 PNG drawn by the browser (the 1 × 1 fixture is too small to crop).
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = 'teal';
        context.fillRect(0, 0, 400, 300);
      }
      return canvas.toDataURL('image/png');
    });
    await page.locator('input[type="file"]').setInputFiles({
      name: 'wide.png',
      mimeType: 'image/png',
      buffer: Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'),
    });
    await expect(page.getByText('400 × 300 px')).toBeVisible();

    await page.getByRole('button', { name: 'Adjust' }).click();
    const dialog = page.getByRole('dialog', { name: 'Adjust photo' });
    await expect(dialog.getByRole('button', { name: 'Use this crop' })).toBeEnabled();
    await expect(dialog.getByRole('region', { name: 'Preview' })).toContainText(
      'Ballot card, large screens',
    );
    await dialog.getByRole('slider', { name: 'Zoom' }).fill('2');
    const frame = dialog.getByRole('button', { name: 'Photo position' });
    await frame.focus();
    await page.keyboard.press('ArrowLeft');
    await dialog.getByRole('button', { name: 'Use this crop' }).click();
    await expect(dialog).toBeHidden();

    // 300 px tall photo, 3:4 at zoom 2: a 112.5 × 150 crop, saved as a 113 × 151 JPEG.
    await expect(page.getByText('wide.jpg')).toBeVisible();
    await expect(page.getByText(/113 × 151 px/)).toBeVisible();

    // Adjust again starts from the original photo and the last crop.
    await page.getByRole('button', { name: 'Adjust' }).click();
    await expect(dialog.getByRole('slider', { name: 'Zoom' })).toHaveValue('2');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('wide.jpg')).toBeVisible();
  });
});

test.describe('results export', () => {
  test('downloads the Excel file once voting is closed', async ({ page, request }) => {
    await applyScenario(request, 'closed');
    await adminSignIn(page);
    await page.goto('/admin/results');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export results (.xlsx)' }).click();
    expect((await download).suggestedFilename()).toBe('pilketum-bcc-2026-results.xlsx');
  });

  test.afterAll(async ({ request }) => {
    await applyScenario(request, 'not-started', { candidateSet: 'default' });
  });
});
