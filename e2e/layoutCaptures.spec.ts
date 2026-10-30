import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildDemoObservations } from '../src/domain/demoData';
import { en } from '../src/i18n/locales/en';
import { fr } from '../src/i18n/locales/fr';
import { STORAGE_LANGUAGE_KEY, STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { TODAY, openApp } from './fixtures';

/**
 * The layout captures of RFC 0002, step 10: each page at 1024 px, each phone page in French, and
 * the installed application. `mise run screenshots` saves them in
 * docs/reference/screens/images/checks/. Without SCREENSHOTS=1, the file has no test.
 */
const DIR = 'docs/reference/screens/images/checks';
const PAGES = ['today', 'chart', 'calendar', 'analytics'] as const;
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

test.skip(process.env.SCREENSHOTS !== '1', 'The captures run only with SCREENSHOTS=1');
// The installed application is light, as the other screen captures
test.use({ colorScheme: 'light' });

const open = async (page: Page, language: 'en' | 'fr' = 'en') => {
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

const settle = (page: Page) =>
  page.waitForFunction(() => !document.documentElement.dataset.pageTransition);

/**
 * The browser cannot emulate `display-mode`. Thus, this turns on each
 * `@media (display-mode: standalone, …)` block where it is, in the same layer and order. The window
 * controls overlay also needs the title bar of the operating system, so the real-device check
 * covers it.
 */
const showAsInstalled = (page: Page) =>
  page.evaluate(() => {
    let count = 0;
    const visit = (list: CSSRuleList) => {
      for (const rule of Array.from(list)) {
        if (
          rule instanceof CSSMediaRule &&
          rule.conditionText.includes('display-mode: standalone')
        ) {
          rule.media.mediaText = 'all';
          count += 1;
        } else if ('cssRules' in rule) {
          visit((rule as CSSGroupingRule).cssRules);
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) visit(sheet.cssRules);
    return count;
  });

test.describe('at 1024 px', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  for (const name of PAGES) {
    test(`captures the ${name} page`, async ({ page }) => {
      await open(page);
      await page.getByRole('tab', { name: en.tabs[name] }).click();
      await settle(page);
      await page.screenshot({ path: `${DIR}/${name}-1024.png` });
    });
  }
});

test.describe('on a phone in French', () => {
  test.use(PHONE);

  for (const name of PAGES) {
    test(`captures the ${name} page`, async ({ page }) => {
      await open(page, 'fr');
      await page
        .getByRole('navigation', { name: fr.mobileTabs.navLabel })
        .getByRole('button', { name: fr.mobileTabs[name], exact: true })
        .click();
      await settle(page);
      await page.screenshot({ path: `${DIR}/${name}-phone-fr.png`, fullPage: true });
    });
  }
});

test.describe('installed', () => {
  test('captures the Today page of the installed phone application', async ({ browser }) => {
    const page = await browser.newPage({ ...PHONE, colorScheme: 'light' });
    await open(page);
    expect(await showAsInstalled(page)).toBeGreaterThan(0);
    await expect(page.getByRole('contentinfo')).toBeHidden();
    await page.screenshot({ path: `${DIR}/today-installed-phone.png` });
    await page.close();
  });

  test('captures the chart of the installed desktop application', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await page.getByRole('tab', { name: en.tabs.chart }).click();
    await settle(page);
    expect(await showAsInstalled(page)).toBeGreaterThan(0);
    await page.screenshot({ path: `${DIR}/chart-installed-wide.png` });
  });
});
