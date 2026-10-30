import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../src/utils/storageKeys';

/** The date of "today" in the browser, so that the dates on the screen are stable. */
export const TODAY = '2026-10-27';

/** Fixes the browser clock at noon UTC on {@link TODAY}. Timers keep running. */
export const fixClock = async (page: Page) => {
  await page.clock.setFixedTime(new Date(`${TODAY}T12:00:00Z`));
};

/** Marks the welcome guide as seen, so that it does not cover the page. */
export const skipWelcome = async (page: Page) => {
  await page.addInitScript(key => {
    // A reload must keep the data of the test, so set only the welcome flag.
    window.localStorage.setItem(key, 'true');
  }, STORAGE_HAS_SEEN_WELCOME_KEY);
};

/** Opens the application on a returning visit, with a fixed date. */
export const openApp = async (page: Page) => {
  await fixClock(page);
  await skipWelcome(page);
  await page.goto('/');
};

/** Escapes the characters that have a meaning in a regular expression. */
export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A pattern for a translated template, for example `en.chartStrip.filledCellLabel`.
 * Each placeholder without a value matches any text.
 */
export const labelPattern = (template: string, values: Record<string, string | number>) =>
  new RegExp(
    `^${template
      .split(/(\{\w+\})/)
      .map(part => {
        const name = /^\{(\w+)\}$/.exec(part)?.[1];
        if (name === undefined) return escapeRegExp(part);
        return Object.hasOwn(values, name) ? escapeRegExp(String(values[name])) : '.*';
      })
      .join('')}$`
  );

/** Opens Settings from the gear of the top bar. */
export const openSettings = async (page: Page) => {
  await page.getByRole('banner').getByRole('button', { name: en.settings.open }).click();
  const settings = page.getByRole('dialog', { name: en.settings.title });
  await expect(settings).toBeVisible();
  return settings;
};

/** Loads the demo cycles from Settings, when the app has no data. */
export const loadDemoData = async (page: Page) => {
  const settings = await openSettings(page);
  await settings.getByRole('button', { name: en.settings.loadDemo }).click();
  await expect(settings).toBeHidden();
};

/** Opens Share chart from the chart options menu. */
export const openShareChart = async (page: Page) => {
  const panel = page.getByRole('tabpanel', { name: en.tabs.chart });
  if (!(await panel.isVisible())) {
    const nav = page.getByRole('navigation', { name: en.mobileTabs.navLabel });
    if (await nav.isVisible()) {
      await nav.getByRole('button', { name: en.mobileTabs.chart, exact: true }).click();
    } else {
      await page.getByRole('tab', { name: en.tabs.chart }).click();
    }
    // A click during the page slide reaches the slide, not the page
    await page.waitForFunction(() => !document.documentElement.dataset.pageTransition);
  }
  await page.getByRole('button', { name: en.chartStrip.optionsLabel }).click();
  await page.getByRole('menuitem', { name: en.chartStrip.shareChart }).click();
  const dialog = page.getByRole('dialog', { name: en.exportModal.title });
  await expect(dialog).toBeVisible();
  return dialog;
};
