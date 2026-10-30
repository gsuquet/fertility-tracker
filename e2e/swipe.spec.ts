import { expect, test } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

test.describe('Swipe between days', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('opens the next and the previous day with a swipe, and not with a scroll', async ({
    page,
  }) => {
    await openApp(page);
    const date = page.getByRole('textbox', { name: en.labels.date });
    await expect(date).toHaveValue('2026-10-27');
    const cdp = await page.context().newCDPSession(page);
    /** A finger that goes through points, relative to its start, then lifts. */
    const drag = async (points: [number, number][]) => {
      // The middle of the screen, under the date bar, on the status card, away from the fields and the edges
      const x = 195;
      const y = 210;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      let from: [number, number] = [0, 0];
      for (const to of points) {
        for (let step = 1; step <= 8; step++) {
          const dx = from[0] + ((to[0] - from[0]) * step) / 8;
          const dy = from[1] + ((to[1] - from[1]) * step) / 8;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x + dx, y: y + dy }],
          });
        }
        from = to;
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const swipe = (dx: number, dy = 0) => drag([[dx, dy]]);

    // Today is the last day: a swipe to the left keeps it
    await swipe(-150);
    await page.waitForTimeout(400);
    await expect(date).toHaveValue('2026-10-27');
    await swipe(150);
    await swipe(150);
    await expect(date).toHaveValue('2026-10-25');
    await swipe(-150);
    await expect(date).toHaveValue('2026-10-26');

    // A vertical drag scrolls the page and keeps the day
    await swipe(-40, -300);
    await page.waitForTimeout(400);
    await expect(date).toHaveValue('2026-10-26');

    // A drag that starts to the side, then goes up, is a scroll too
    await page.evaluate(() => window.scrollTo(0, 0));
    await drag([
      [-30, 0],
      [-30, -300],
    ]);
    await page.waitForTimeout(400);
    await expect(date).toHaveValue('2026-10-26');
  });
});
