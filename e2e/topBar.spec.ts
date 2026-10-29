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
    const controls = [
      bar.getByRole('button', { name: fr.cyclePicker.buttonLabel }),
      bar.getByRole('button', { name: fr.chartStrip.view35 }),
      bar.getByRole('button', { name: fr.chartStrip.viewStrip }),
      bar.getByRole('button', { name: fr.chartStrip.optionsLabel }),
      bar.getByRole('button', { name: fr.menu.moreActionsLabel }),
    ];
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
