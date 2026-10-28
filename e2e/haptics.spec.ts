import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

/** A Vibration API that records each pattern. */
const recordVibrations = async (page: Page) => {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    Object.assign(window, { vibrations: calls });
    navigator.vibrate = pattern => {
      calls.push(pattern);
      return true;
    };
  });
};

const vibrations = (page: Page) =>
  page.evaluate(() => (window as unknown as { vibrations: unknown[] }).vibrations);

test.describe('Haptic feedback', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('vibrates on a save and on Peak Day, and stops after the menu turns it off', async ({
    page,
  }) => {
    await recordVibrations(page);
    await openApp(page);
    await page.getByRole('textbox', { name: en.labels.directInput }).fill('10KL');
    await page.getByRole('button', { name: en.actions.setPeak }).click();
    await page.getByRole('button', { name: en.actions.save }).click();
    await expect.poll(() => vibrations(page)).toEqual([10, 15]);
    await page.getByRole('button', { name: en.mobileTabs.log, exact: true }).click();
    await expect.poll(() => vibrations(page)).toEqual([10, 15, 10]);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: en.menu.moreActionsLabel }).click();
    const menu = page.getByRole('dialog', { name: en.menu.mobileMenuLabel });
    await menu.getByRole('button', { name: en.menu.hapticsOn }).click();
    await expect(menu.getByRole('button', { name: en.menu.hapticsOff })).toBeVisible();
    await page.keyboard.press('Escape');

    // The choice stays after a reload
    await page.reload();
    await page.getByRole('button', { name: en.mobileTabs.log, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: en.actions.removePeak }).click();
    expect(await vibrations(page)).toEqual([]);
  });
});
