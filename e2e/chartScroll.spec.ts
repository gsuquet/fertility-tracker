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

/**
 * The place of the cell of today in its strip: `visible` when the whole cell shows, and `offCentre`,
 * the distance between the centres of the cell and of the strip, in pixels.
 */
const todayPlace = (page: Page) =>
  page.evaluate(() => {
    const cell = document.querySelector('.chart-cell.is-today');
    const strip = cell?.closest('.chart-row-scroll');
    if (!cell || !strip) return null;
    const c = cell.getBoundingClientRect();
    const s = strip.getBoundingClientRect();
    return {
      visible: c.left >= s.left && c.right <= s.right,
      offCentre: Math.abs(c.left + c.width / 2 - (s.left + s.width / 2)),
    };
  });

for (const width of [390, 1440]) {
  test.describe(`Chart at ${width} pixels`, () => {
    test.use({ viewport: { width, height: 844 } });

    test('opens a long cycle with today in view, also after a reload and a page change', async ({
      page,
    }) => {
      await openChart(page, 40);
      await expect.poll(async () => (await todayPlace(page))?.visible).toBe(true);
      // The page itself does not scroll down to the strip
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      await page.reload();
      await expect.poll(async () => (await todayPlace(page))?.visible).toBe(true);

      await page.goto('/#today');
      await page.goto('/#chart');
      await expect.poll(async () => (await todayPlace(page))?.visible).toBe(true);
    });
  });
}

test.describe('Chart on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('puts today near the middle at once, when cells follow it', async ({ page }) => {
    // Day 20 of 35 cells: the strip can put today in the middle
    await openChart(page, 20);
    await page.locator('.chart-cell.is-today').waitFor();
    // No poll: the strip is in place at the first read, with no smooth scroll
    const place = await todayPlace(page);
    expect(place?.visible).toBe(true);
    // The snap of the cells moves the strip by less than one cell of 56 pixels
    expect(place?.offCentre).toBeLessThan(56);
  });
});
