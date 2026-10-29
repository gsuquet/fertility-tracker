import { expect, test } from '@playwright/test';
import type { CDPSession, Locator, Page } from '@playwright/test';
import { buildDemoObservations } from '../src/domain/demoData';
import { en } from '../src/i18n/locales/en';
import { STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { TODAY, openApp, openShareChart } from './fixtures';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

/** Opens the application with the demo cycles, so the pages are long enough to scroll. */
const openWithDemo = async (page: Page) => {
  await page.addInitScript(
    ([key, value]) => {
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value);
    },
    [STORAGE_OBSERVATIONS_KEY, JSON.stringify(buildDemoObservations(TODAY))] as const
  );
  await openApp(page);
};

/** A finger that moves from (x, y) to (x + dx, y + dy) in 10 steps, waits, then lifts. */
const finger =
  (page: Page, cdp: CDPSession) => async (x: number, y: number, dx: number, dy: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + (dx * step) / 10, y: y + (dy * step) / 10 }],
      });
    }
    // A pause, so the release is not a flick
    await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

/** The box of a sheet at the end of its slide up, so that a swipe lands on it. */
const settledBox = async (sheet: Locator) => {
  await sheet.evaluate(element => Promise.all(element.getAnimations().map(a => a.finished)));
  const box = await sheet.boundingBox();
  if (!box) throw new Error('The sheet has no box');
  return box;
};

test.describe('Bottom sheets with touch', () => {
  test('slides a dialog sheet up from the bottom of the screen when it opens', async ({ page }) => {
    await openWithDemo(page);
    await page
      .getByRole('navigation', { name: en.mobileTabs.navLabel })
      .getByRole('button', { name: en.mobileTabs.chart, exact: true })
      .click();
    // A click during the page slide reaches the slide, not the page
    await page.waitForFunction(() => !document.documentElement.dataset.pageTransition);
    await page.getByRole('button', { name: en.chartStrip.optionsLabel }).click();
    // The first frame after the click: the sheet is still low, and nothing scrolled to the focus
    const first = await page.getByRole('menuitem', { name: en.chartStrip.shareChart }).evaluate(
      item =>
        new Promise<{ scrollTop: number; top: number; height: number }>(resolve => {
          (item as HTMLElement).click();
          // The dialog is a lazy chunk: measure the first frame that has it
          const measure = () => {
            const sheet = document.querySelector('.export-modal-enhanced');
            if (!sheet) {
              requestAnimationFrame(measure);
              return;
            }
            const dialog = sheet.closest('dialog') as HTMLDialogElement;
            resolve({
              scrollTop: dialog.scrollTop,
              top: sheet.getBoundingClientRect().top,
              height: sheet.getBoundingClientRect().height,
            });
          };
          requestAnimationFrame(measure);
        })
    );
    expect(first.scrollTop).toBe(0);
    const final = 844 - first.height;
    expect(first.top).toBeGreaterThan(final + 100);
    await expect(page.getByRole('button', { name: en.exportModal.close })).toBeFocused();
    await expect
      .poll(async () => (await page.locator('.export-modal-enhanced').boundingBox())?.y)
      .toBeCloseTo(final, 0);
  });

  test('closes the cycle menu with a swipe down, and a swipe up does not scroll the page', async ({
    page,
  }) => {
    await openWithDemo(page);
    const swipe = finger(page, await page.context().newCDPSession(page));
    await page.getByRole('button', { name: en.cyclePicker.buttonLabel }).click();
    const menu = page.getByRole('dialog', { name: en.cyclePicker.menuTitle });
    await expect(menu).toBeVisible();
    const box = await settledBox(menu.locator('.cycle-dropdown-menu'));

    await swipe(195, box.y + 100, 0, -300);
    await page.waitForTimeout(300);
    expect(await scrollY(page)).toBe(0);
    await expect(menu).toBeVisible();

    await swipe(195, box.y + 100, 0, 300);
    await expect(menu).toBeHidden();
    // The selection did not change
    await expect(page.getByRole('button', { name: en.cyclePicker.buttonLabel })).toContainText(
      'Cycle 2'
    );
  });
});

test.describe('Dialog sheets with touch', () => {
  test('closes the export dialog with a swipe down, and a swipe up on its header does not scroll the page', async ({
    page,
  }) => {
    await openWithDemo(page);
    const swipe = finger(page, await page.context().newCDPSession(page));
    const dialog = await openShareChart(page);
    await settledBox(dialog.locator('.modal-container'));
    const header = await dialog.locator('.modal-header').boundingBox();
    if (!header) throw new Error('The header has no box');

    await swipe(120, header.y + header.height / 2, 0, -300);
    await page.waitForTimeout(300);
    expect(await scrollY(page)).toBe(0);
    await expect(dialog).toBeVisible();

    await swipe(120, header.y + header.height / 2, 0, 500);
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // A swipe down from the top of the body closes it too
    await openShareChart(page);
    await settledBox(dialog.locator('.modal-container'));
    const body = await dialog.locator('.modal-body').boundingBox();
    if (!body) throw new Error('The body has no box');
    await swipe(195, body.y + 40, 0, 500);
    await expect(dialog).toBeHidden();
  });
});

test.describe('Swipe between months', () => {
  test('opens the previous and the next month, and never a month after the current one', async ({
    page,
  }) => {
    await openWithDemo(page);
    const swipe = finger(page, await page.context().newCDPSession(page));
    await page
      .getByRole('navigation', { name: en.mobileTabs.navLabel })
      .getByRole('button', { name: en.mobileTabs.calendar })
      .click();
    // During the slide of the page, the touches go to the view transition and not to the page
    await page.waitForFunction(() => !document.documentElement.dataset.pageTransition);
    const calendar = page.getByRole('tabpanel', { name: en.tabs.calendar });
    const title = calendar.getByRole('heading', { level: 2 });
    await expect(title).toHaveText(`${en.calendar.months[9]} 2026`);

    await swipe(100, 400, 200, 0);
    await expect(title).toHaveText(`${en.calendar.months[8]} 2026`);
    await swipe(300, 400, -200, 0);
    await expect(title).toHaveText(`${en.calendar.months[9]} 2026`);

    // The current month: a swipe to the left keeps it, and does not open a day
    await swipe(300, 400, -200, 0);
    await page.waitForTimeout(400);
    await expect(title).toHaveText(`${en.calendar.months[9]} 2026`);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // A vertical drag scrolls and keeps the month
    await swipe(200, 600, -30, -300);
    await page.waitForTimeout(400);
    await expect(title).toHaveText(`${en.calendar.months[9]} 2026`);
  });
});
