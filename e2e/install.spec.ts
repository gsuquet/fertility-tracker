import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { loadDemoData, openApp } from './fixtures';

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
  await loadDemoData(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The banner waits while the undo message shows
  await page.getByRole('button', { name: en.undoToast.dismiss }).click();
};

const banner = (page: Page) => page.getByRole('complementary', { name: en.install.bannerTitle });

/** Checks the install row of Settings, then closes Settings */
const expectInstallInSettings = async (page: Page, shown: boolean) => {
  await page.getByRole('button', { name: en.settings.open }).click();
  const settings = page.getByRole('dialog', { name: en.settings.title });
  await expect(settings).toBeVisible();
  await expect(settings.getByText(en.install.menuEntry)).toHaveCount(shown ? 1 : 0);
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();
};

test.describe('Install offer', () => {
  test.use({ viewport: { width: 1500, height: 900 } });

  test('shows no banner and no install button before the browser can install', async ({ page }) => {
    await openApp(page);
    await loadDemo(page);
    await expect(banner(page)).toBeHidden();
    await expectInstallInSettings(page, false);
  });

  test('offers the install one time, after the app has data', async ({ page }) => {
    await openApp(page);
    await offerInstall(page);
    // No banner without data, but Settings has Install
    await expectInstallInSettings(page, true);
    await expect(banner(page)).toBeHidden();

    await loadDemo(page);
    await expect(banner(page)).toBeVisible();

    await banner(page).getByRole('button', { name: en.install.bannerInstall, exact: true }).click();
    expect(await page.evaluate(() => (window as Window & { prompts?: number }).prompts)).toBe(1);
    await expect(banner(page)).toBeHidden();

    // The banner never comes back, also after a new install offer
    await page.reload();
    await offerInstall(page);
    await expectInstallInSettings(page, true);
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
