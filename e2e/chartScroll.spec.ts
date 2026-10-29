import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { makeObservation } from '../src/test/factories';
import { addDays } from '../src/utils/dateUtils';
import { STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { en } from '../src/i18n/locales/en';
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
    // The strip has no snap, so today stays within one card of 48 pixels of the middle
    expect(place?.offCentre).toBeLessThan(48);
  });

  test('scrolls all the cycles together, so a cycle day stays in one column', async ({ page }) => {
    // Two cycles: 30 days, then the current cycle of 20 days
    const data = cycleUntilToday(50);
    data[30] = makeObservation({ date: data[30]?.date as string, bleeding: 'H', codeString: 'H' });
    await fixClock(page);
    await skipWelcome(page);
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify(data),
    ] as const);
    await page.goto('/#chart');
    await page.getByRole('button', { name: en.cyclePicker.buttonLabel }).click();
    await page.getByRole('option', { name: new RegExp(en.cyclePicker.allCycles) }).click();
    const strips = page.locator('.chart-row-scroll');
    await expect(strips).toHaveCount(2);

    const lefts = () =>
      strips.evaluateAll(all => all.map(strip => Math.round((strip as HTMLElement).scrollLeft)));
    // The rows open on the column of today
    await expect.poll(async () => (await lefts())[0]).toBeGreaterThan(0);
    expect(new Set(await lefts()).size).toBe(1);
    await strips.nth(1).evaluate(strip => {
      strip.scrollLeft = 137;
    });
    await expect.poll(lefts).toEqual([137, 137]);
  });
});

test.describe('Chart on a desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('selects a day with a click and the arrow keys, and opens it in Today', async ({ page }) => {
    await openChart(page, 20);
    const chart = page.getByRole('tabpanel', { name: en.tabs.chart });
    const detail = chart.getByRole('region', { name: en.chartStrip.detailLabel });
    // Today is selected when the chart opens
    await expect(detail).toContainText('Cycle 1, day 20');

    // A click on a day selects it, and a second click opens the drawer
    const today = chart.locator('.chart-cell.is-today');
    const before = chart.locator('.chart-cell').filter({ hasText: /^18/ }).first();
    await before.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(detail).toContainText('Cycle 1, day 18');
    await before.click();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await today.click();
    await expect(detail).toContainText('Cycle 1, day 20');
    await page.keyboard.press('ArrowLeft');
    await expect(detail).toContainText('Cycle 1, day 19');
    await expect(chart.locator('.chart-cell.is-selected')).toBeFocused();

    // The column of 44 px keeps 28 days in view at 1440 px
    const width = await today.evaluate(cell => cell.getBoundingClientRect().width);
    expect(width).toBe(44);

    await detail.getByRole('button', { name: en.chartStrip.openInToday }).click();
    // Today opens on the selected day, the day before today
    const todayPage = page.getByRole('tabpanel', { name: en.tabs.today });
    await expect(todayPage.getByText(en.todayView.yesterday, { exact: true })).toBeVisible();
  });
});
