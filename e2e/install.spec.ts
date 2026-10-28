import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

/**
 * Sends `beforeinstallprompt` as Chromium does when the app can be installed. Headless Chromium
 * never sends it, so the test sends it. The prompt only counts its calls in `window.prompts`.
 */
const offerInstall = (page: Page) =>
  page.evaluate(() => {
    const target = window as Window & { prompts?: number };
    target.prompts = 0;
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => {
        target.prompts = (target.prompts ?? 0) + 1;
      },
    });
    window.dispatchEvent(event);
  });

const loadDemo = async (page: Page) => {
  await page.getByRole('button', { name: en.actions.exportPdf }).click();
  await page.getByRole('button', { name: en.actions.loadDemo }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The banner waits while the undo message shows
  await page.getByRole('button', { name: en.undoToast.dismiss }).click();
};

const banner = (page: Page) => page.getByRole('complementary', { name: en.install.bannerTitle });

test.describe('Install offer', () => {
  // The header has the install button on a screen of 1440 pixels or more
  test.use({ viewport: { width: 1500, height: 900 } });

  test('shows no banner and no install button before the browser can install', async ({ page }) => {
    await openApp(page);
    await loadDemo(page);
    await expect(banner(page)).toBeHidden();
    await expect(page.getByRole('button', { name: en.install.headerLabel })).toBeHidden();
  });

  test('offers the install one time, after the app has data', async ({ page }) => {
    await openApp(page);
    await offerInstall(page);
    // No banner without data, but the header button is there
    await expect(page.getByRole('button', { name: en.install.headerLabel })).toBeVisible();
    await expect(banner(page)).toBeHidden();

    await loadDemo(page);
    await expect(banner(page)).toBeVisible();

    await banner(page).getByRole('button', { name: en.install.bannerInstall, exact: true }).click();
    expect(await page.evaluate(() => (window as Window & { prompts?: number }).prompts)).toBe(1);
    await expect(banner(page)).toBeHidden();

    // The banner never comes back, also after a new install offer
    await page.reload();
    await offerInstall(page);
    await expect(page.getByRole('button', { name: en.install.headerLabel })).toBeVisible();
    await expect(banner(page)).toBeHidden();
  });

  test('closes the banner for good with its close button', async ({ page }) => {
    await openApp(page);
    await loadDemo(page);
    await offerInstall(page);
    await banner(page).getByRole('button', { name: en.install.bannerClose }).click();
    await expect(banner(page)).toBeHidden();

    await page.reload();
    await offerInstall(page);
    await expect(banner(page)).toBeHidden();
  });
});
