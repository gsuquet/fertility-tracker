import { expect, test } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

test.describe('Observation drawer', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens the saved observation of today from +, and a save keeps it', async ({ page }) => {
    await openApp(page);
    await page.getByRole('textbox', { name: en.labels.directInput }).fill('10KL');
    await page.getByRole('button', { name: en.actions.save }).click();
    await expect(page.getByRole('status')).toHaveText(en.todayView.savedNotice);

    const nav = page.getByRole('navigation', { name: en.mobileTabs.navLabel });
    await nav.getByRole('button', { name: en.mobileTabs.log }).click();
    const drawer = page.getByRole('dialog', { name: en.drawer.editTitle });
    await expect(drawer.getByRole('textbox', { name: en.labels.directInput })).toHaveValue('10KL');
    await expect(drawer.getByRole('button', { name: en.actions.delete })).toBeVisible();

    await drawer.getByRole('button', { name: en.actions.save }).click();
    await expect(drawer).toBeHidden();
    await nav.getByRole('button', { name: en.mobileTabs.log }).click();
    await expect(
      page
        .getByRole('dialog', { name: en.drawer.editTitle })
        .getByRole('textbox', { name: en.labels.directInput })
    ).toHaveValue('10KL');
  });
});
