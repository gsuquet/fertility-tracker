import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { STORAGE_OBSERVATIONS_KEY, STORAGE_RECOVERY_KEY } from '../src/utils/storageKeys';
import { en } from '../src/i18n/locales/en';
import { TODAY, openApp } from './fixtures';

const directCode = (page: Page) => page.getByRole('textbox', { name: en.labels.directInput });

const readKey = (page: Page, key: string) =>
  page.evaluate(k => window.localStorage.getItem(k), key);

/** Opens the app, writes `text` as the saved observations, then reloads to read it. */
const openWithStoredText = async (page: Page, text: string) => {
  await openApp(page);
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
    STORAGE_OBSERVATIONS_KEY,
    text,
  ] as const);
  await page.reload();
};

/** Deletes the recovery copy through the notice and its confirm dialog. */
const deleteRecoveryCopy = async (page: Page) => {
  const notice = page.getByRole('alert');
  await notice.getByRole('button', { name: en.storageRecovery.dismiss }).click();
  const confirm = page.getByRole('dialog', { name: en.confirmDialog.recoveryTitle });
  await confirm.getByRole('button', { name: en.confirmDialog.recoveryConfirm }).click();
  await expect(confirm).toBeHidden();
  await expect(notice).toBeHidden();
  expect(await readKey(page, STORAGE_RECOVERY_KEY)).toBeNull();
};

test.describe('Fertility Tracker with damaged or unavailable storage', () => {
  test('keeps a copy of saved data that is not JSON and deletes it on request', async ({
    page,
  }) => {
    const corrupt = '[{"date": "2026-10-27", "stretch":';
    await openWithStoredText(page, corrupt);

    await expect(page.getByRole('alert')).toContainText(en.storageRecovery.message);
    expect(await readKey(page, STORAGE_RECOVERY_KEY)).toBe(corrupt);

    await deleteRecoveryCopy(page);
    await page.reload();
    await expect(page.getByRole('tab', { name: en.tabs.today })).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('shows the valid records of a list that has one bad record', async ({ page }) => {
    const partial = JSON.stringify([
      { id: 'obs_today', date: TODAY, stretch: '10', modifiers: ['K'], frequency: 'X3' },
      { id: 'obs_bad', date: 'not a date' },
    ]);
    await openWithStoredText(page, partial);

    await expect(page.getByRole('alert')).toContainText(en.storageRecovery.messagePartialOne);
    await expect(directCode(page)).toHaveValue('10KX3');
    expect(await readKey(page, STORAGE_RECOVERY_KEY)).toBe(partial);

    await deleteRecoveryCopy(page);
    await page.reload();
    await expect(directCode(page)).toHaveValue('10KX3');
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('warns when the browser refuses to save the observations', async ({ page }) => {
    await page.addInitScript(key => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name: string, value: string) {
        if (name === key) throw new DOMException('Quota exceeded', 'QuotaExceededError');
        setItem.call(this, name, value);
      };
    }, STORAGE_OBSERVATIONS_KEY);
    await openApp(page);

    await directCode(page).fill('10KLX3');
    await page.getByRole('button', { name: en.actions.save }).click();

    const warning = page.getByRole('alert');
    await expect(warning).toContainText(en.storageWarning.saveFailed);
    // The observation stays on the page until a reload.
    await expect(directCode(page)).toHaveValue('10KLX3');
    expect(await readKey(page, STORAGE_OBSERVATIONS_KEY)).toBeNull();

    // Back up now downloads the backup at once
    const download = page.waitForEvent('download');
    await warning.getByRole('button', { name: en.storageWarning.backUpNow }).click();
    expect((await download).suggestedFilename()).toMatch(/\.ftbackup$/);
  });

  test('loads and saves without a network after the first visit', async ({ page, context }) => {
    await openApp(page);
    // The service worker controls the page when it has stored all the application files.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    await page.reload();

    await page.getByRole('tab', { name: en.tabs.chart }).click();
    await expect(page.getByRole('tabpanel', { name: en.tabs.chart })).toBeVisible();
    await page.getByRole('tab', { name: en.tabs.today }).click();
    await directCode(page).fill('10KLX3');
    await page.getByRole('button', { name: en.actions.save }).click();
    await expect(page.getByRole('status')).toHaveText(en.todayView.savedNotice);
  });

  test('opens the page of the hash without a network', async ({ page, context }) => {
    await openApp(page);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    // The browser does not send the hash, so the service worker gives the application shell
    await page.goto('/#chart');
    await page.reload();
    await expect(page.getByRole('tabpanel', { name: en.tabs.chart })).toBeVisible();
  });
});
