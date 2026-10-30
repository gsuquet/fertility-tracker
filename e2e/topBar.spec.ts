import { expect, test } from '@playwright/test';
import { buildDemoObservations } from '../src/domain/demoData';
import { fr } from '../src/i18n/locales/fr';
import { STORAGE_LANGUAGE_KEY, STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { TODAY, openApp } from './fixtures';

// French is the size reference of RFC 0002, and 360 pixels is a common Android width
test.describe('Top bar of a narrow phone in French', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });

  test('the chart controls fit in the bar, with no overlap', async ({ page }) => {
    await page.addInitScript(
      ([obsKey, obs, langKey]) => {
        window.localStorage.setItem(obsKey, obs);
        window.localStorage.setItem(langKey, 'fr');
      },
      [
        STORAGE_OBSERVATIONS_KEY,
        JSON.stringify(buildDemoObservations(TODAY)),
        STORAGE_LANGUAGE_KEY,
      ] as const
    );
    await openApp(page);
    await page
      .getByRole('navigation', { name: fr.mobileTabs.navLabel })
      .getByRole('button', { name: fr.mobileTabs.chart, exact: true })
      .click();

    const bar = page.getByRole('banner');
    await expect(bar.getByRole('group', { name: fr.chartStrip.viewLabel })).toBeVisible();
    const controls = [
      bar.getByRole('button', { name: fr.cyclePicker.buttonLabel }),
      bar.getByRole('button', { name: fr.chartStrip.view35 }),
      bar.getByRole('button', { name: fr.chartStrip.viewStrip }),
      bar.getByRole('button', { name: fr.chartStrip.optionsLabel }),
      bar.getByRole('button', { name: fr.settings.open }),
    ];
    // The label of the picker shows in full: "Cycle 2", not "Cycle…"
    const label = bar.locator('.cycle-selector-text.mobile-text');
    await expect(label).toHaveText(/^Cycle \d+$/);
    expect(await label.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);

    const boxes = [];
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      boxes.push(box as NonNullable<typeof box>);
    }
    // Each control is in the screen, and starts after the end of the one before it
    for (const [index, box] of boxes.entries()) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
      if (index > 0) {
        const before = boxes[index - 1] as (typeof boxes)[number];
        expect(box.x).toBeGreaterThanOrEqual(before.x + before.width);
      }
    }
  });
});

// RFC 0002, desktop shell: one row of 60 px from 1360 px, and a second row of 44 px below it
test.describe('Top bar of a computer in French', () => {
  for (const { width, rows } of [
    { width: 1440, rows: 1 },
    { width: 1360, rows: 1 },
    { width: 1359, rows: 2 },
    { width: 1024, rows: 2 },
  ]) {
    test(`fits at ${width} px, with ${rows} row(s) on Today and Chart`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(
        ([obsKey, obs, langKey]) => {
          window.localStorage.setItem(obsKey, obs);
          window.localStorage.setItem(langKey, 'fr');
        },
        [
          STORAGE_OBSERVATIONS_KEY,
          JSON.stringify(buildDemoObservations(TODAY)),
          STORAGE_LANGUAGE_KEY,
        ] as const
      );
      await openApp(page);
      const bar = page.getByRole('banner');
      const tabs = bar.getByRole('tablist', { name: fr.menu.mainNavLabel });

      for (const tab of ['today', 'chart', 'calendar', 'analytics'] as const) {
        await tabs.getByRole('tab', { name: fr.tabs[tab] }).click();
        await expect(tabs.getByRole('tab', { name: fr.tabs[tab] })).toHaveAttribute(
          'aria-selected',
          'true'
        );
        // The page does not scroll to the side (F11)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        const box = await bar.boundingBox();
        const withControls = tab === 'today' || tab === 'chart';
        // 60 px, plus the second row of 44 px, plus the line under the bar
        const height = rows === 2 && withControls ? 60 + 44 + 1 : 60;
        expect(Math.round(box?.height ?? 0)).toBeLessThanOrEqual(height + 1);
        expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(height);
        // The statistics bar is on Analytics only
        await expect(page.getByRole('list', { name: fr.stats.label })).toHaveCount(
          tab === 'analytics' ? 1 : 0
        );
      }

      // The page controls of Today are in the bar, and the controls of the bar do not overlap
      await tabs.getByRole('tab', { name: fr.tabs.today }).click();
      const controls = [
        tabs,
        bar.getByRole('button', { name: fr.cyclePicker.buttonLabel }),
        bar.getByRole('button', { name: fr.todayView.prevDay }),
        bar.getByRole('button', { name: fr.mobileTabs.log, exact: true }),
        bar.getByRole('button', { name: fr.settings.open }),
      ];
      const boxes: { x: number; width: number }[] = [];
      for (const control of controls) {
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        boxes.push(box as NonNullable<typeof box>);
      }
      for (const box of boxes) {
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      // The tabs, the cycle picker, Log and the gear are in this order on the first row
      const [tabList, picker, , log, gear] = boxes as [
        (typeof boxes)[number],
        (typeof boxes)[number],
        (typeof boxes)[number],
        (typeof boxes)[number],
        (typeof boxes)[number],
      ];
      expect(picker.x).toBeGreaterThanOrEqual(tabList.x + tabList.width);
      expect(log.x).toBeGreaterThanOrEqual(picker.x + picker.width);
      expect(gear.x).toBeGreaterThanOrEqual(log.x + log.width);
    });
  }
});
