import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { makeObservation } from '../src/test/factories';
import { addDays } from '../src/utils/dateUtils';
import { STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { TODAY, fixClock, skipWelcome } from './fixtures';

/** A cycle of `days` days that ends today, with an observation on each day. */
const cycleUntilToday = (days: number) =>
  Array.from({ length: days }, (_, i) => {
    const date = addDays(TODAY, i - days + 1);
    return i === 0
      ? makeObservation({ date, bleeding: 'H', codeString: 'H' })
      : makeObservation({ date, stretch: '0', codeString: '0' });
  });

const openChart = async (page: Page, days: number) => {
  await fixClock(page);
  await skipWelcome(page);
  await page.addInitScript(
    ([key, data]) => {
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, data);
    },
    [STORAGE_OBSERVATIONS_KEY, JSON.stringify(cycleUntilToday(days))] as const
  );
  await page.goto('/#chart');
};

/** True when the cell of today is fully inside the visible part of its strip. */
const todayIsVisible = (page: Page) =>
  page.evaluate(() => {
    const cell = document.querySelector('.chart-cell.is-today');
    const strip = cell?.closest('.chart-row-scroll');
    if (!cell || !strip) return false;
    const c = cell.getBoundingClientRect();
    const s = strip.getBoundingClientRect();
    return c.left >= s.left && c.right <= s.right;
  });

for (const width of [390, 1440]) {
  test.describe(`Chart at ${width} pixels`, () => {
    test.use({ viewport: { width, height: 844 } });

    test('opens the current cycle with today in view, also after a reload and a tab change', async ({
      page,
    }) => {
      await openChart(page, 40);
      await expect.poll(() => todayIsVisible(page)).toBe(true);
      // The page itself does not scroll down to the strip
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      await page.reload();
      await expect.poll(() => todayIsVisible(page)).toBe(true);

      await page.goto('/#today');
      await page.goto('/#chart');
      await expect.poll(() => todayIsVisible(page)).toBe(true);
    });
  });
}
