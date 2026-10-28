import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

/** Records the direction of each view transition that the app starts. */
const recordTransitions = async (page: Page) => {
  await page.addInitScript(() => {
    const transitions: (string | undefined)[] = [];
    Object.assign(window, { transitions });
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (update?: ViewTransitionUpdateCallback) => {
      transitions.push(document.documentElement.dataset.pageTransition);
      return start(update);
    };
  });
};

const transitions = (page: Page) =>
  page.evaluate(() => (window as unknown as { transitions: string[] }).transitions);

const openTab = async (page: Page, name: string) => {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('tabpanel', { name })).toBeVisible();
};

test.describe('Page slide', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('slides in the page order, and the header stays in place', async ({ page }) => {
    await recordTransitions(page);
    await openApp(page);
    await openTab(page, en.tabs.calendar);
    await openTab(page, en.tabs.chart);
    expect(await transitions(page)).toEqual(['forward', 'back']);
    await expect(page.locator('.app-header')).toHaveCSS('view-transition-name', 'app-header');
    // The analytics page slides only after its first load
    await openTab(page, en.tabs.analytics);
    await openTab(page, en.tabs.today);
    await openTab(page, en.tabs.analytics);
    expect(await transitions(page)).toEqual(['forward', 'back', 'back', 'forward']);
    // Back goes to the page on the left
    await page.goBack();
    await expect(page.getByRole('tabpanel', { name: en.tabs.today })).toBeVisible();
    expect((await transitions(page)).at(-1)).toBe('back');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.pageTransition))
      .toBeUndefined();
  });

  test('changes the page at once with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordTransitions(page);
    await openApp(page);
    await openTab(page, en.tabs.chart);
    await openTab(page, en.tabs.today);
    expect(await transitions(page)).toEqual([]);
  });
});
