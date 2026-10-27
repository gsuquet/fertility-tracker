import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { en } from '../src/i18n/locales/en';
import { TODAY, fixClock, openApp } from './fixtures';

const directCode = (page: Page) => page.getByRole('textbox', { name: en.labels.directInput });

const logObservation = async (page: Page, code: string) => {
  await directCode(page).fill(code);
  await page.getByRole('button', { name: en.actions.save }).click();
  await expect(page.getByRole('status')).toHaveText(en.todayView.savedNotice);
};

const savedObservations = (page: Page) =>
  page.evaluate(key => window.localStorage.getItem(key), STORAGE_OBSERVATIONS_KEY);

test.describe('Fertility Tracker in a browser', () => {
  test('shows the welcome guide on the first visit and closes it with the keyboard', async ({
    page,
  }) => {
    await fixClock(page);
    await page.goto('/');

    const guide = page.getByRole('dialog', { name: en.welcomeModal.title });
    await expect(guide).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(guide).toBeHidden();

    // The guide shows on the first visit only.
    await page.reload();
    await expect(page.getByRole('tab', { name: en.tabs.today })).toBeVisible();
    await expect(guide).toBeHidden();
  });

  test('keeps an observation logged in the Today view after a reload', async ({ page }) => {
    await openApp(page);
    await logObservation(page, '10KLX3');

    await page.reload();

    await expect(directCode(page)).toHaveValue('10KLX3');
    await expect(page.getByRole('button', { name: /^Tue, 10\/27 .*10KLX3/ })).toBeVisible();
  });

  test('restores the observations from a JSON backup', async ({ page }) => {
    await openApp(page);
    await logObservation(page, '10KLX3 I');
    const before = await savedObservations(page);

    const exportDialog = page.getByRole('dialog', { name: en.exportModal.title });
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    const downloadEvent = page.waitForEvent('download');
    await exportDialog.getByRole('button', { name: en.actions.exportJson }).click();
    const backupPath = await (await downloadEvent).path();
    expect(await readFile(backupPath, 'utf-8')).toContain('10KLX3 I');

    // Clear the data, so that only the restore can bring the observation back.
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await exportDialog.getByRole('button', { name: en.actions.clearData }).click();
    const clearConfirm = page.getByRole('dialog', { name: en.confirmDialog.clearTitle });
    await expect(clearConfirm).toBeVisible();
    await clearConfirm.getByRole('button', { name: en.confirmDialog.clearConfirm }).click();
    await expect(clearConfirm).toBeHidden();
    await expect(exportDialog).toBeHidden();
    await expect(directCode(page)).toHaveValue('');
    const undoToast = page.getByRole('status').filter({ hasText: en.undoToast.clear });
    await expect(undoToast).toBeVisible();
    await expect(undoToast.getByRole('button', { name: en.undoToast.undo })).toBeVisible();

    // A new observation of the same day deletes the undo copy, and the restore must replace it.
    await logObservation(page, '0AD');
    await expect(undoToast).toBeHidden();

    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    const fileChooser = page.waitForEvent('filechooser');
    await exportDialog.getByRole('button', { name: en.actions.importJson }).click();
    await (await fileChooser).setFiles(backupPath);
    const preview = page.getByRole('dialog', { name: en.confirmDialog.importTitle });
    await expect(preview).toContainText(
      en.confirmDialog.importSummary
        .replace('{count}', '1')
        .replace('{first}', TODAY)
        .replace('{last}', TODAY)
    );
    await expect(preview).toContainText(en.confirmDialog.importChoice.replace('{count}', '1'));
    await preview.getByRole('button', { name: en.confirmDialog.importReplace }).click();
    await expect(preview).toBeHidden();
    await expect(exportDialog).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: en.undoToast.import })).toBeVisible();
    await expect(directCode(page)).toHaveValue('10KLX3 I');
    expect(await savedObservations(page)).toBe(before);

    await page.reload();
    await expect(directCode(page)).toHaveValue('10KLX3 I');
    expect(await savedObservations(page)).toBe(before);
  });

  test('shows the demo data in the chart, calendar and analytics views', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await page.getByRole('button', { name: en.actions.loadDemo }).click();

    // The demo Peak Day is cycle day 13 of the newest cycle, 2026-10-12.
    await page.getByRole('tab', { name: en.tabs.chart }).click();
    const chart = page.getByRole('tabpanel', { name: en.tabs.chart });
    await expect(
      chart.getByRole('button', { name: /^Cycle Day 13, Date 2026-10-12, Stamp WHITE_BABY/ })
    ).toBeVisible();
    await expect(chart.getByRole('button', { name: /Date 2026-10-27, .*Today$/ })).toBeVisible();

    await page.getByRole('tab', { name: en.tabs.calendar }).click();
    const calendar = page.getByRole('tabpanel', { name: en.tabs.calendar });
    await expect(calendar.getByRole('heading', { name: 'October 2026' })).toBeVisible();
    await expect(
      calendar.getByRole('button', { name: 'Date 2026-10-12, Observation 10KLAD' })
    ).toBeVisible();

    await page.getByRole('tab', { name: en.tabs.analytics }).click();
    const analytics = page.getByRole('tabpanel', { name: en.tabs.analytics });
    await expect(
      analytics.getByRole('heading', { name: new RegExp(`^${en.analytics.phasesTitle}`) })
    ).toBeVisible();
    await expect(analytics).toContainText(en.analytics.normalLuteal);
    await expect(analytics).toContainText('CD 13 (2026-10-12)');
  });

  test('sets and clears a manual Peak Day in the drawer', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await page.getByRole('button', { name: en.actions.loadDemo }).click();
    await page.getByRole('tab', { name: en.tabs.chart }).click();
    const chart = page.getByRole('tabpanel', { name: en.tabs.chart });
    const peakStat = (text: string) => page.getByTitle(`${en.stats.peakDay}: ${text}`);
    const cell = (date: string, stamp: string) =>
      chart.getByRole('button', { name: new RegExp(`Date ${date}, Stamp ${stamp},`) });
    const drawer = page.getByRole('dialog', { name: 'Edit Observation' });

    // The detected Peak Day is cycle day 13. Cycle day 18 is a dry day after the post-peak days.
    await expect(peakStat('CD 13 (2026-10-12)')).toBeVisible();
    await expect(cell('2026-10-17', 'DARK_GREEN')).toBeVisible();

    await cell('2026-10-16', 'DARK_GREEN').click();
    await drawer.getByRole('button', { name: en.actions.setPeak }).click();
    await drawer.getByRole('button', { name: en.actions.save }).click();
    await expect(drawer).toBeHidden();
    await expect(peakStat('CD 17 (2026-10-16)')).toBeVisible();
    await expect(cell('2026-10-17', 'LIGHT_GREEN_BABY_1')).toBeVisible();

    await cell('2026-10-16', 'DARK_GREEN').click();
    await drawer.getByRole('button', { name: en.actions.removePeak }).click();
    await drawer.getByRole('button', { name: en.actions.save }).click();
    await expect(drawer).toBeHidden();
    await expect(peakStat('CD 13 (2026-10-12)')).toBeVisible();
    await expect(cell('2026-10-17', 'DARK_GREEN')).toBeVisible();

    await page.reload();
    await expect(peakStat('CD 13 (2026-10-12)')).toBeVisible();
  });
});
