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

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('is a sheet with the two actions at the bottom of the screen', async ({ page }) => {
      await openApp(page);
      await loadDemoData(page);
      const dialog = await openShareChart(page);
      const sheet = dialog.locator('.share-dialog');
      await expect.poll(async () => (await sheet.boundingBox())?.width).toBe(390);
      for (const name of [en.exportModal.downloadPng, en.exportModal.printPdf]) {
        const button = dialog.getByRole('button', { name });
        await expect(button).toBeInViewport();
        expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }
      // No cycle selected: the two actions are disabled
      await dialog.getByRole('checkbox').first().uncheck();
      await expect(dialog.getByRole('button', { name: en.exportModal.printPdf })).toBeDisabled();
    });
  });
});
