import type { Page } from '@playwright/test';
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
        if (name === undefined) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return Object.hasOwn(values, name)
          ? String(values[name]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          : '.*';
      })
      .join('')}$`
  );
