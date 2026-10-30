import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp, openSettings } from './fixtures';

/**
 * The installed app, with a Badging API that records each call. A Playwright browser is never
 * installed, so the display mode and the API are fakes.
 */
const fakeInstalledApp = async (page: Page) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.assign(window, { badgeCalls: calls });
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = query =>
      query === '(display-mode: standalone)'
        ? ({ ...matchMedia(query), matches: true, media: query } as MediaQueryList)
        : matchMedia(query);
    navigator.setAppBadge = async () => {
      calls.push('set');
    };
    navigator.clearAppBadge = async () => {
      calls.push('clear');
    };
  });
};

const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { badgeCalls: string[] }).badgeCalls);

test.describe('App icon badge', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('shows a dot while today has no observation, after the user turns it on', async ({
    page,
  }) => {
    await fakeInstalledApp(page);
    await openApp(page);
    // Off by default: the app only removes a dot
    await expect.poll(() => calls(page)).toEqual(['clear']);

    const settings = await openSettings(page);
    await settings.getByRole('switch', { name: en.appBadge.title }).click();
    await expect.poll(() => calls(page)).toEqual(['clear', 'set']);
    await page.keyboard.press('Escape');

    await page.getByRole('textbox', { name: en.labels.directInput }).fill('10KL');
    await page.getByRole('button', { name: en.actions.save }).click();
    await expect.poll(() => calls(page)).toEqual(['clear', 'set', 'clear']);

    // The choice stays after a reload: a delete of the observation of today shows the dot again
    await page.reload();
    await expect.poll(() => calls(page)).toEqual(['clear']);
    await page.getByRole('button', { name: en.observationForm.actionsLabel }).click();
    await page.getByRole('menuitem', { name: en.observationForm.deleteObservation }).click();
    await expect.poll(() => calls(page)).toEqual(['clear', 'set']);
  });
});
