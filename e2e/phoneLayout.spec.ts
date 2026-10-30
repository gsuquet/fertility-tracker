import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildDemoObservations } from '../src/domain/demoData';
import { en } from '../src/i18n/locales/en';
import { fr } from '../src/i18n/locales/fr';
import { STORAGE_LANGUAGE_KEY, STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { TODAY, openApp } from './fixtures';

/**
 * The phone project of playwright.config.ts (390 × 844 px) runs this file. It checks the rules
 * of RFC 0002 on each page, in English and in French: no page is wider than the screen, no text
 * is smaller than 11 px, the controls used each day are 44 px or more, and the navigation marks
 * the current page.
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

/** The page scrolls only in height. A strip that scrolls inside the page is correct. */
const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

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

const expectAtLeast44 = async (page: Page, name: string | RegExp) => {
  const box = await page.getByRole('button', { name, exact: true }).first().boundingBox();
  expect(box, String(name)).not.toBeNull();
  expect(Math.round(box?.height ?? 0), String(name)).toBeGreaterThanOrEqual(44);
  expect(Math.round(box?.width ?? 0), String(name)).toBeGreaterThanOrEqual(44);
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
      for (const name of PAGES) await expectAtLeast44(page, t.mobileTabs[name]);
      await expectAtLeast44(page, t.mobileTabs.log);
      await expectAtLeast44(page, t.todayView.prevDay);
      await expectAtLeast44(page, t.todayView.nextDay);
      await expectAtLeast44(page, t.todayView.savedLabel);
    });
  });
}
