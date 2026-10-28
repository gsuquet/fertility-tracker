import { expect, test } from '@playwright/test';
import type { CDPSession, Locator, Page } from '@playwright/test';
import { buildDemoObservations } from '../src/domain/demoData';
import { en } from '../src/i18n/locales/en';
import { STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { TODAY, openApp } from './fixtures';

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
  test('closes the phone menu with a swipe down, and a swipe up does not scroll the page', async ({
    page,
  }) => {
    await openWithDemo(page);
    const swipe = finger(page, await page.context().newCDPSession(page));
    const open = async () => {
      await page.getByRole('button', { name: en.menu.moreActionsLabel }).click();
      const menu = page.getByRole('dialog', { name: en.menu.mobileMenuLabel });
      await expect(menu).toBeVisible();
      return menu;
    };

    const menu = await open();
    const box = await settledBox(menu.locator('.mobile-action-sheet'));
    // A swipe up on the list and on the backdrop keeps the page in place
    await swipe(195, box.y + 150, 0, -300);
    await swipe(195, box.y - 100, 0, -200);
    await page.waitForTimeout(300);
    expect(await scrollY(page)).toBe(0);
    await expect(menu).toBeVisible();

    // A swipe down that starts on an action closes the menu, and the action does not run
    await swipe(195, box.y + 150, 0, 400);
    await expect(menu).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // A swipe down on the header closes it too
    const again = await open();
    await settledBox(again.locator('.mobile-action-sheet'));
    const header = await again.locator('.mobile-action-sheet-header').boundingBox();
    if (!header) throw new Error('The header has no box');
    await swipe(120, header.y + header.height / 2, 0, 400);
    await expect(again).toBeHidden();
  });

  test('slides the phone menu up from the bottom of the screen when it opens', async ({ page }) => {
    await openWithDemo(page);
    // The first frame after the click: the sheet is still low, and nothing scrolled to the focus
    const first = await page.evaluate(
      () =>
        new Promise<{ scrollTop: number; top: number; height: number }>(resolve => {
          (document.querySelector('.mobile-more-btn') as HTMLElement).click();
          requestAnimationFrame(() => {
            const dialog = document.querySelector('dialog') as HTMLDialogElement;
            const sheet = document.querySelector('.mobile-action-sheet') as HTMLElement;
            resolve({
              scrollTop: dialog.scrollTop,
              top: sheet.getBoundingClientRect().top,
              height: sheet.getBoundingClientRect().height,
            });
          });
        })
    );
    expect(first.scrollTop).toBe(0);
    const final = 844 - first.height;
    expect(first.top).toBeGreaterThan(final + 100);
    await expect(page.getByRole('button', { name: en.menu.closeMenu })).toBeFocused();
    await expect
      .poll(async () => (await page.locator('.mobile-action-sheet').boundingBox())?.y)
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
    await page.getByRole('button', { name: en.menu.moreActionsLabel }).click();
    await page
      .getByRole('dialog', { name: en.menu.mobileMenuLabel })
      .getByRole('button', { name: new RegExp(en.actions.exportPdf) })
      .click();
    const dialog = page.getByRole('dialog', { name: en.exportModal.title });
    await expect(dialog).toBeVisible();
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
