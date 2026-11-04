import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { TODAY, loadDemoData, openApp, openShareChart } from './fixtures';

/** The width and the height of a PNG file, from its IHDR chunk */
const pngSize = (file: Buffer) => [file.readUInt32BE(16), file.readUInt32BE(20)];

test.describe('Share chart', () => {
  test('downloads a sharp PNG of the selected cycles', async ({ page }) => {
    await openApp(page);
    await loadDemoData(page);
    const dialog = await openShareChart(page);

    // The newest cycle is selected at the start; the next one is added
    const boxes = dialog.getByRole('checkbox');
    await expect(boxes.first()).toBeChecked();
    await boxes.nth(1).check();

    const downloadEvent = page.waitForEvent('download');
    await dialog.getByRole('button', { name: en.exportModal.downloadPng }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^fertility-tracker-chart-(selected|all)-cycles-${TODAY}\\.png$`)
    );
    const file = await readFile(await download.path());
    // The PNG signature, then a row of 35 days at two pixels for each CSS pixel
    expect(file.subarray(1, 4).toString()).toBe('PNG');
    const [width, height] = pngSize(file);
    expect(width).toBe(3176);
    expect(height).toBeGreaterThan(600);
    // The undo message of the demo data is also a status
    await expect(
      page.getByRole('status').filter({ hasText: en.exportModal.pngSuccess })
    ).toBeVisible();
    await expect(dialog).toBeHidden();
  });

  test('downloads a PDF file of one page with the chart image', async ({ page }) => {
    await openApp(page);
    await loadDemoData(page);
    const dialog = await openShareChart(page);

    const downloadEvent = page.waitForEvent('download');
    await dialog.getByRole('button', { name: en.exportModal.downloadPdf }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^fertility-tracker-chart-cycle-\\d+-${TODAY}\\.pdf$`)
    );
    const file = await readFile(await download.path());
    const text = file.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 1');
    // The JPEG of the browser: its start of image, at two pixels for each CSS pixel
    expect(text).toContain('/Width 3176 ');
    expect(text).toContain('stream\n\xff\xd8');
    await expect(
      page.getByRole('status').filter({ hasText: en.exportModal.pdfSuccess })
    ).toBeVisible();
    await expect(dialog).toBeHidden();
  });

  test('opens the share sheet with the PDF file on an iPhone', async ({ page }) => {
    await page.addInitScript(() => {
      const shared: string[] = [];
      Object.assign(window, { sharedFiles: shared });
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone)' });
      Object.assign(navigator, {
        canShare: () => true,
        share: async ({ files }: ShareData) => {
          for (const file of files ?? []) shared.push(`${file.name} ${file.type} ${file.size}`);
        },
      });
    });
    await openApp(page);
    const dialog = await openShareChart(page);
    await dialog.getByRole('button', { name: en.exportModal.downloadPdf }).click();
    await expect(dialog).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { sharedFiles: string[] }).sharedFiles))
      .toEqual([expect.stringMatching(new RegExp(`-${TODAY}\\.pdf application/pdf \\d+$`))]);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('is a sheet with the three actions at the bottom of the screen', async ({ page }) => {
      await openApp(page);
      await loadDemoData(page);
      const dialog = await openShareChart(page);
      const sheet = dialog.locator('.share-dialog');
      await expect.poll(async () => (await sheet.boundingBox())?.width).toBe(390);
      for (const name of [
        en.exportModal.print,
        en.exportModal.downloadPng,
        en.exportModal.downloadPdf,
      ]) {
        const button = dialog.getByRole('button', { name });
        await expect(button).toBeInViewport();
        expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }
      // No cycle selected: the actions are disabled
      await dialog.getByRole('checkbox').first().uncheck();
      await expect(dialog.getByRole('button', { name: en.exportModal.print })).toBeDisabled();
    });
  });
});
