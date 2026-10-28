import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

test.describe('Observation drawer', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens the saved observation of today from +, and a save keeps it', async ({ page }) => {
    await openApp(page);
    await page.getByRole('textbox', { name: en.labels.directInput }).fill('10KL');
    await page.getByRole('button', { name: en.actions.save }).click();
    await expect(page.getByRole('status')).toHaveText(en.todayView.savedNotice);

    const nav = page.getByRole('navigation', { name: en.mobileTabs.navLabel });
    await nav.getByRole('button', { name: en.mobileTabs.log }).click();
    const drawer = page.getByRole('dialog', { name: en.drawer.editTitle });
    await expect(drawer.getByRole('textbox', { name: en.labels.directInput })).toHaveValue('10KL');
    await expect(drawer.getByRole('button', { name: en.actions.delete })).toBeVisible();

    await drawer.getByRole('button', { name: en.actions.save }).click();
    await expect(drawer).toBeHidden();
    await nav.getByRole('button', { name: en.mobileTabs.log }).click();
    await expect(
      page
        .getByRole('dialog', { name: en.drawer.editTitle })
        .getByRole('textbox', { name: en.labels.directInput })
    ).toHaveValue('10KL');
  });

  test('closes the sheet with a long drag on its handle, and puts it back after a short one', async ({
    page,
  }) => {
    await openApp(page);
    const nav = page.getByRole('navigation', { name: en.mobileTabs.navLabel });
    await nav.getByRole('button', { name: en.mobileTabs.log }).click();
    const drawer = page.getByRole('dialog', { name: en.actions.newEntry });
    await expect(drawer).toBeVisible();
    const handle = drawer.locator('.sheet-handle');
    await expect(handle).toBeVisible();

    const drag = async (distance: number) => {
      const box = await handle.boundingBox();
      if (!box) throw new Error('The handle has no box');
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + distance / 2, { steps: 5 });
      await page.mouse.move(x, y + distance, { steps: 5 });
      // A pause, so the release is not a flick
      await page.waitForTimeout(150);
      await page.mouse.up();
    };

    const sheet = drawer.locator('.drawer-container');
    const top = async () => (await sheet.boundingBox())?.y;
    const openTop = await top();
    await drag(60);
    await expect(drawer).toBeVisible();
    await expect.poll(top).toBeCloseTo(openTop as number, 0);

    await drag(400);
    await expect(drawer).toBeHidden();
    // The history entry of the drawer is gone, so Back does not go to it
    await expect
      .poll(() =>
        page.evaluate(() => (window.history.state as { ftLayerDepth?: number })?.ftLayerDepth ?? 0)
      )
      .toBe(0);
  });
});

test.describe('Observation drawer with touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /** Opens the drawer, and gives a finger that moves through points, with a pause at the end. */
  const setUp = async (page: Page) => {
    await openApp(page);
    const nav = page.getByRole('navigation', { name: en.mobileTabs.navLabel });
    await nav.getByRole('button', { name: en.mobileTabs.log }).click();
    const drawer = page.getByRole('dialog', { name: en.actions.newEntry });
    await expect(drawer).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (x: number, from: number, to: number) => {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: from }],
      });
      for (let step = 1; step <= 10; step++) {
        const y = from + ((to - from) * step) / 10;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      }
      await page.waitForTimeout(150);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    return { drawer, swipe };
  };

  test('closes the sheet with a finger on the handle', async ({ page }) => {
    const { drawer, swipe } = await setUp(page);
    const box = await drawer.locator('.sheet-handle').boundingBox();
    if (!box) throw new Error('The handle has no box');
    await swipe(box.x + box.width / 2, box.y + box.height / 2, 700);
    await expect(drawer).toBeHidden();
  });

  test('moves the sheet from the top of the form, and scrolls a form that is not at the top', async ({
    page,
  }) => {
    const { drawer, swipe } = await setUp(page);
    const form = drawer.locator('form');
    const box = await form.boundingBox();
    if (!box) throw new Error('The form has no box');
    const x = box.x + box.width / 2;

    await form.evaluate(element => {
      element.scrollTop = 200;
    });
    await swipe(x, box.y + 100, box.y + 400);
    await expect(drawer).toBeVisible();
    await expect.poll(() => form.evaluate(element => element.scrollTop)).toBeLessThan(200);

    await form.evaluate(element => {
      element.scrollTop = 0;
    });
    await swipe(x, box.y + 100, box.y + 600);
    await expect(drawer).toBeHidden();
  });
});
