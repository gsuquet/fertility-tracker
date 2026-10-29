import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { en } from '../src/i18n/locales/en';
import { formatMessage } from '../src/i18n/format';
import { formatDateDisplay } from '../src/utils/dateUtils';
import { TODAY, escapeRegExp, fixClock, labelPattern, openApp } from './fixtures';

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
    const dayLabel = formatDateDisplay(TODAY, en.locale, {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
    });
    await expect(
      page.getByRole('button', { name: new RegExp(`^${escapeRegExp(dayLabel)} .*10KLX3`) })
    ).toBeVisible();
  });

  test('restores the observations from a .ftbackup file', async ({ page }) => {
    await openApp(page);
    await logObservation(page, '10KLX3 I');
    const before = await savedObservations(page);

    const exportDialog = page.getByRole('dialog', { name: en.exportModal.title });
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    const downloadEvent = page.waitForEvent('download');
    await exportDialog.getByRole('button', { name: en.actions.exportJson }).click();
    const download = await downloadEvent;
    // The name keeps .ftbackup: no .json is added after it
    expect(download.suggestedFilename()).toBe(`fertility-tracker-backup-${TODAY}.ftbackup`);
    const backup = await readFile(await download.path(), 'utf-8');
    expect(backup).toContain('10KLX3 I');

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
    await (await fileChooser).setFiles({
      name: download.suggestedFilename(),
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(backup),
    });
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
      chart.getByRole('button', {
        name: labelPattern(en.chartStrip.filledCellLabel, {
          day: 13,
          date: '2026-10-12',
          stamp: 'WHITE_BABY',
        }),
      })
    ).toBeVisible();
    await expect(
      chart.getByRole('button', {
        name: labelPattern(en.chartStrip.filledCellLabel, {
          date: TODAY,
          today: en.chartStrip.todaySuffix,
        }),
      })
    ).toBeVisible();

    await page.getByRole('tab', { name: en.tabs.calendar }).click();
    const calendar = page.getByRole('tabpanel', { name: en.tabs.calendar });
    await expect(
      calendar.getByRole('heading', { name: `${en.calendar.months[9]} 2026` })
    ).toBeVisible();
    await expect(
      calendar.getByRole('button', {
        name: formatMessage(en.calendar.dayLabel, {
          date: '2026-10-12',
          status: formatMessage(en.calendar.observationStatus, { code: '10KLAD' }),
        }),
      })
    ).toBeVisible();

    await page.getByRole('tab', { name: en.tabs.analytics }).click();
    const analytics = page.getByRole('tabpanel', { name: en.tabs.analytics });
    await expect(
      analytics.getByRole('heading', { name: new RegExp(`^${en.analytics.phasesTitle}`) })
    ).toBeVisible();
    await expect(analytics).toContainText(en.analytics.normalLuteal);
    await expect(analytics).toContainText(
      formatMessage(en.common.cycleDayDate, { day: 13, date: '2026-10-12' })
    );
  });

  test('sets and clears a manual Peak Day in the drawer', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await page.getByRole('button', { name: en.actions.loadDemo }).click();
    await page.getByRole('tab', { name: en.tabs.chart }).click();
    const chart = page.getByRole('tabpanel', { name: en.tabs.chart });
    const peakStat = (day: number, date: string) =>
      page.getByTitle(
        new RegExp(
          `^${escapeRegExp(en.stats.peakDay)}\\W+${escapeRegExp(formatMessage(en.common.cycleDayDate, { day, date }))}$`
        )
      );
    const cell = (date: string, stamp: string) =>
      chart.getByRole('button', {
        name: labelPattern(en.chartStrip.filledCellLabel, { date, stamp }),
      });
    const drawer = page.getByRole('dialog', { name: en.drawer.editTitle });

    // The detected Peak Day is cycle day 13. Cycle day 18 is a dry day after the post-peak days.
    await expect(peakStat(13, '2026-10-12')).toBeVisible();
    await expect(cell('2026-10-17', 'DARK_GREEN')).toBeVisible();

    await cell('2026-10-16', 'DARK_GREEN').click();
    await chart.getByRole('button', { name: en.chartStrip.editDay }).click();
    await drawer.getByRole('switch', { name: en.actions.setPeak }).click();
    await drawer.getByRole('button', { name: en.actions.save }).click();
    await expect(drawer).toBeHidden();
    await expect(peakStat(17, '2026-10-16')).toBeVisible();
    await expect(cell('2026-10-17', 'LIGHT_GREEN_BABY_1')).toBeVisible();

    // The day is still selected, so a click opens the drawer
    await cell('2026-10-16', 'DARK_GREEN').click();
    await drawer.getByRole('switch', { name: en.actions.setPeak }).click();
    await drawer.getByRole('button', { name: en.actions.save }).click();
    await expect(drawer).toBeHidden();
    await expect(peakStat(13, '2026-10-12')).toBeVisible();
    await expect(cell('2026-10-17', 'DARK_GREEN')).toBeVisible();

    await page.reload();
    await expect(peakStat(13, '2026-10-12')).toBeVisible();
  });

  test('keeps the undo toast usable in the drawer dialog', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await page.getByRole('button', { name: en.actions.loadDemo }).click();
    const toast = page.getByRole('status').filter({ hasText: en.undoToast.demo });
    await expect(toast).toBeVisible();

    await page.getByRole('tab', { name: en.tabs.chart }).click();
    const chart = page.getByRole('tabpanel', { name: en.tabs.chart });
    const filledCells = chart.getByRole('button', {
      name: labelPattern(en.chartStrip.filledCellLabel, {}),
    });
    await chart
      .getByRole('button', {
        name: labelPattern(en.chartStrip.filledCellLabel, { date: '2026-10-12' }),
      })
      .click();
    // On a desktop, a click selects the day, and Edit opens the drawer
    await chart.getByRole('button', { name: en.chartStrip.editDay }).click();
    // The title follows the saved data of the date, so it changes after Undo
    const drawer = page.getByRole('dialog', {
      name: new RegExp(`${en.drawer.editTitle}|${en.actions.newEntry}`),
    });
    await expect(drawer).toHaveAccessibleName(en.drawer.editTitle);

    // The toast is in the top dialog, so the focus trap of the dialog reaches Undo.
    const undo = drawer.getByRole('button', { name: en.undoToast.undo });
    await expect(undo).toBeVisible();
    // Tab until Undo has the focus, or until the focus is back on the first element. A date
    // field keeps the focus for more than one Tab, so a repeat is not the end of the cycle.
    await page.evaluate(() => {
      (window as unknown as { first: Element | null }).first = document.activeElement;
    });
    let step: 'undo' | 'first' | 'next' = 'next';
    while (step === 'next') {
      await page.keyboard.press('Tab');
      step = await undo.evaluate(button => {
        const { first } = window as unknown as { first: Element | null };
        if (document.activeElement === button) return 'undo';
        return document.activeElement === first ? 'first' : 'next';
      });
    }
    await expect(undo).toBeFocused();

    await undo.click();
    await expect(toast).toBeHidden();
    await expect(drawer).toBeFocused();
    await expect(drawer).toHaveAccessibleName(en.actions.newEntry);
    await expect(filledCells).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(filledCells).toHaveCount(0);
    await expect(toast).toBeHidden();
    expect(await savedObservations(page)).toBe('[]');
  });
});
