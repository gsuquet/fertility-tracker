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
    const swipe = async (dx: number, dy = 0) => {
      // The middle of the screen, under the date bar, away from the fields and the edges
      const x = 195;
      const y = 300;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x + (dx * step) / 8, y: y + (dy * step) / 8 }],
        });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };

    await swipe(-150);
    await expect(date).toHaveValue('2026-10-28');
    await swipe(150);
    await expect(date).toHaveValue('2026-10-27');
    await swipe(150);
    await expect(date).toHaveValue('2026-10-26');

    // A vertical drag scrolls the page and keeps the day
    await swipe(-40, -300);
    await page.waitForTimeout(400);
    await expect(date).toHaveValue('2026-10-26');
  });
});
