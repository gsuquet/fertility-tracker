import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

/** Presses the back button of the browser. The app changes only its own history entries. */
const pressBack = (page: Page) => page.evaluate(() => window.history.back());

/** The page buttons at the bottom of a phone screen. */
const navButton = (page: Page, name: string) =>
  page.getByRole('navigation', { name: en.mobileTabs.navLabel }).getByRole('button', { name });

/** The + button of the page buttons opens the drawer. It shows on a phone screen only. */
const quickAdd = (page: Page) => navButton(page, en.mobileTabs.log);

const panel = (page: Page, name: 'today' | 'chart' | 'calendar') => page.locator(`#${name}-panel`);

test.describe('Back button and address', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('closes the drawer with Back and gives the focus back to its opener', async ({ page }) => {
    await openApp(page);
    const opener = quickAdd(page);
    await opener.click();
    const drawer = page.getByRole('dialog', { name: en.actions.newEntry });
    await expect(drawer).toBeVisible();

    await pressBack(page);
    await expect(drawer).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(panel(page, 'today')).toBeVisible();
  });

  test('closes two stacked dialogs one by one with two Back presses', async ({ page }) => {
    await openApp(page);
    await page.getByRole('textbox', { name: en.labels.directInput }).fill('10KL');
    await page.getByRole('button', { name: en.actions.save }).click();
    await expect(page.getByRole('status')).toHaveText(en.todayView.savedNotice);

    await page.getByRole('button', { name: en.menu.moreActionsLabel }).click();
    await page
      .getByRole('button', { name: new RegExp(en.actions.exportPdf.replace('/', '\\/')) })
      .click();
    const exportDialog = page.getByRole('dialog', { name: en.exportModal.title });
    await exportDialog.getByRole('button', { name: en.actions.clearData }).click();
    const confirm = page.getByRole('dialog', { name: en.confirmDialog.clearTitle });
    await expect(confirm).toBeVisible();

    await pressBack(page);
    await expect(confirm).toBeHidden();
    await expect(exportDialog).toBeVisible();

    await pressBack(page);
    await expect(exportDialog).toBeHidden();
    await expect(panel(page, 'today')).toBeVisible();
  });

  test('goes back to the previous page with Back, and the hash shows the page', async ({
    page,
  }) => {
    await openApp(page);
    await navButton(page, en.mobileTabs.calendar).click();
    await expect(page).toHaveURL(/#calendar$/);

    await pressBack(page);
    await expect(panel(page, 'today')).toBeVisible();
    await expect(page).not.toHaveURL(/#/);
  });

  test('leaves the app with Back on Today when no layer is open', async ({ page }) => {
    await page.goto('about:blank');
    await openApp(page);
    await quickAdd(page).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Closing the drawer removed its entry, so Back leaves the app
    await page.goBack();
    await expect(page).toHaveURL('about:blank');
  });

  test('opens the page of the hash after a reload, with no dialog', async ({ page }) => {
    await openApp(page);
    await navButton(page, en.mobileTabs.chart).click();
    await quickAdd(page).click();
    await expect(page.getByRole('dialog', { name: en.actions.newEntry })).toBeVisible();

    await page.reload();
    await expect(panel(page, 'chart')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The entry of the closed drawer is gone: Back opens the previous page at once
    await pressBack(page);
    await expect(panel(page, 'today')).toBeVisible();
  });

  test('opens Today for an unknown hash', async ({ page }) => {
    await openApp(page);
    await page.goto('/#unknown');
    await expect(panel(page, 'today')).toBeVisible();
  });
});
