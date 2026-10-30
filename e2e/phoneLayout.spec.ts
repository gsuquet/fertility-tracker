import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { buildDemoObservations } from '../src/domain/demoData';
import { en } from '../src/i18n/locales/en';
import { fr } from '../src/i18n/locales/fr';
import { STORAGE_LANGUAGE_KEY, STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { TODAY, openApp } from './fixtures';

/**
 * The phone project of playwright.config.ts (390 × 844 px) runs this file. It checks the rules
 * of RFC 0002 on each page, in English and in French: no page is wider than the screen, no text
 * is smaller than 11 px, the controls used each day are 44 px or more, and the navigation marks
 * the current page. The text check reads the computed font size: it does not see a transform.
 */
const LANGUAGES = { en, fr } as const;
const PAGES = ['today', 'chart', 'calendar', 'analytics'] as const;

/** Opens the application in a language, with the demo cycles. */
const openInLanguage = async (page: Page, language: keyof typeof LANGUAGES) => {
  await page.addInitScript(
    ([dataKey, data, languageKey, value]) => {
      if (!window.localStorage.getItem(dataKey)) window.localStorage.setItem(dataKey, data);
      window.localStorage.setItem(languageKey, value);
    },
    [
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify(buildDemoObservations(TODAY)),
      STORAGE_LANGUAGE_KEY,
      language,
    ] as const
  );
  await openApp(page);
};

/**
 * The page scrolls only in height. The page and the main part clip a wide content, so the test
 * measures both. A strip that scrolls inside the page is correct.
 */
const pageOverflow = (page: Page) =>
  page.evaluate(() =>
    Math.max(
      ...[document.documentElement, document.querySelector('.main-content')].map(element =>
        element ? element.scrollWidth - element.clientWidth : 0
      )
    )
  );

/** The visible texts of less than 11 px, as "text (size)". */
const smallTexts = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('body *')).flatMap(element => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const text = Array.from(element.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent?.trim())
        .join('');
      if (!text || box.width === 0 || box.height === 0 || style.visibility === 'hidden') return [];
      return Number.parseFloat(style.fontSize) < 11 ? [`${text} (${style.fontSize})`] : [];
    })
  );

/** A control used each day is 44 by 44 px or more. The locator must find one control. */
const expectAtLeast44 = async (control: Locator) => {
  const box = await control.boundingBox();
  const name = String(control);
  expect(box, name).not.toBeNull();
  expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(44 - 0.01);
  expect(box?.width ?? 0, name).toBeGreaterThanOrEqual(44 - 0.01);
};

for (const [language, t] of Object.entries(LANGUAGES) as [keyof typeof LANGUAGES, typeof en][]) {
  test.describe(`Phone layout (${language})`, () => {
    test.beforeEach(async ({ page }) => {
      await openInLanguage(page, language);
    });

    for (const name of PAGES) {
      test(`the ${name} page fits the screen and has no text under 11 px`, async ({ page }) => {
        const nav = page.getByRole('navigation', { name: t.mobileTabs.navLabel });
        const button = nav.getByRole('button', { name: t.mobileTabs[name], exact: true });
        await button.click();
        await expect(button).toHaveAttribute('aria-current', 'page');
        await expect(nav.locator('[aria-current]')).toHaveCount(1);
        await expect(page.getByRole('tabpanel', { name: t.tabs[name] })).toBeVisible();
        await page.waitForFunction(() => !document.documentElement.dataset.pageTransition);

        expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
        expect(await smallTexts(page)).toEqual([]);
      });
    }

    test('Settings fits the screen and has no text under 11 px', async ({ page }) => {
      await page.getByRole('banner').getByRole('button', { name: t.settings.open }).click();
      await expect(page.getByRole('dialog', { name: t.settings.title })).toBeVisible();
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      expect(await smallTexts(page)).toEqual([]);
    });

    test('the controls of each day are 44 px or more', async ({ page }) => {
      const nav = page.getByRole('navigation', { name: t.mobileTabs.navLabel });
      for (const name of [...PAGES, 'log'] as const) {
        await expectAtLeast44(nav.getByRole('button', { name: t.mobileTabs[name], exact: true }));
      }
      const top = page.getByRole('banner');
      await expectAtLeast44(top.getByRole('button', { name: t.todayView.prevDay, exact: true }));
      await expectAtLeast44(top.getByRole('button', { name: t.todayView.nextDay, exact: true }));
      const form = page.locator('form.today-form-card');
      await expectAtLeast44(form.locator('button[type="submit"]'));

      // Each group row, and each chip of an open group
      const rows = form.locator('button[aria-expanded]');
      expect(await rows.count()).toBeGreaterThan(0);
      for (const row of await rows.all()) await expectAtLeast44(row);
      await rows.first().click();
      const chips = form.locator('[role="radio"], button[aria-pressed]');
      expect(await chips.count()).toBeGreaterThan(0);
      for (const chip of await chips.all()) {
        if (await chip.isVisible()) await expectAtLeast44(chip);
      }
    });

    test('the menus and the sheets have no text under 11 px', async ({ page }) => {
      // The cycle picker of the top bar
      await page
        .getByRole('banner')
        .getByRole('button', { name: t.cyclePicker.buttonLabel })
        .click();
      await expect(page.getByRole('listbox')).toBeVisible();
      expect(await smallTexts(page)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('listbox')).toBeHidden();

      // The actions menu of the status card
      await page.getByRole('button', { name: t.observationForm.actionsLabel }).click();
      await expect(page.getByRole('menu')).toBeVisible();
      expect(await smallTexts(page)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toBeHidden();

      // The observation sheet of +
      const nav = page.getByRole('navigation', { name: t.mobileTabs.navLabel });
      await nav.getByRole('button', { name: t.mobileTabs.log, exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await smallTexts(page)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();

      // The legend of the chart
      await nav.getByRole('button', { name: t.mobileTabs.chart, exact: true }).click();
      await page.getByRole('button', { name: t.chartStrip.showLegend }).click();
      await expect(page.getByRole('button', { name: t.chartStrip.hideLegend })).toBeVisible();
      expect(await smallTexts(page)).toEqual([]);
    });
  });
}
