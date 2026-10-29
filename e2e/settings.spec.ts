import { expect, test } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { fr } from '../src/i18n/locales/fr';
import { openApp, openSettings } from './fixtures';

test.describe('Settings on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('is a full page over the bottom bar, and Back closes it', async ({ page }) => {
    await openApp(page);
    const settings = await openSettings(page);
    const panel = settings.locator('.settings-dialog');
    await expect.poll(async () => (await panel.boundingBox())?.height).toBe(844);
    expect((await panel.boundingBox())?.y).toBe(0);
    // The bottom bar is under the page: a tap at the bottom of the screen reaches Settings
    const bottom = await page.evaluate(() =>
      Boolean(document.elementFromPoint(195, 830)?.closest('.settings-dialog'))
    );
    expect(bottom).toBe(true);
    const back = settings.getByRole('button', { name: en.settings.close });
    await expect(back).toBeInViewport();
    expect((await back.boundingBox())?.x).toBeLessThan(40);

    await page.goBack();
    await expect(settings).toBeHidden();
    await expect(page.getByRole('tabpanel', { name: en.tabs.today })).toBeVisible();
  });

  test('changes the language and the theme, and keeps them after a reload', async ({ page }) => {
    await openApp(page);
    const settings = await openSettings(page);
    await settings.getByRole('combobox', { name: en.settings.language }).selectOption('fr');
    const french = page.getByRole('dialog', { name: fr.settings.title });
    await expect(french).toBeVisible();
    await french
      .getByRole('group', { name: fr.settings.theme })
      .getByRole('radio', { name: fr.settings.themeDark })
      .check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.getByRole('banner').getByRole('button', { name: fr.settings.open })
    ).toBeVisible();
  });
});
