import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { buildDemoObservations } from '../src/domain/demoData';
import { en } from '../src/i18n/locales/en';
import { STORAGE_OBSERVATIONS_KEY } from '../src/utils/storageKeys';
import { TODAY, labelPattern, openApp, openSettings, openShareChart } from './fixtures';

/**
 * The ARIA snapshot of each screen, at the two sizes of ADR 0006. The snapshots are in
 * docs/reference/screens/snapshots/, and each screen page links to them. After a correct change
 * of a screen, update them with `npx playwright test e2e/screenLayout.spec.ts --update-snapshots`.
 * With SCREENSHOTS=1 (`mise run screenshots`), the test also saves a screenshot of each screen in
 * docs/reference/screens/images/.
 */
const SCREENSHOT_DIR = process.env.SCREENSHOTS === '1' ? 'docs/reference/screens/images' : null;
const SIZES = {
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    colorScheme: 'light',
  },
  wide: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    colorScheme: 'light',
  },
} as const;

type Size = keyof typeof SIZES;
type Tab = keyof typeof en.tabs;

/** Opens the application with the demo cycles, so that each screen shows data. */
const openWithDemo = async (page: Page) => {
  await page.addInitScript(
    ([key, value]) => {
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value);
    },
    [STORAGE_OBSERVATIONS_KEY, JSON.stringify(buildDemoObservations(TODAY))] as const
  );
  await openApp(page);
};

const openTab = async (page: Page, size: Size, tab: Tab) => {
  if (size === 'phone') {
    await page
      .getByRole('navigation', { name: en.mobileTabs.navLabel })
      .getByRole('button', { name: en.mobileTabs[tab], exact: true })
      .click();
  } else {
    await page.getByRole('tab', { name: en.tabs[tab] }).click();
  }
  await expect(page.getByRole('tabpanel', { name: en.tabs[tab] })).toBeVisible();
  // The screenshot waits for the end of the page slide
  await page.waitForFunction(() => !document.documentElement.dataset.pageTransition);
};

/** Waits for the end of the slide of a dialog or a sheet. */
const settled = async (dialog: Locator) => {
  await expect(dialog).toBeVisible();
  await dialog.evaluate(element => Promise.all(element.getAnimations().map(a => a.finished)));
  return dialog;
};

const openDialog: Record<string, (page: Page, size: Size) => Promise<Locator>> = {
  'observation-drawer': async (page, size) => {
    if (size === 'phone') {
      await page
        .getByRole('navigation', { name: en.mobileTabs.navLabel })
        .getByRole('button', { name: en.mobileTabs.log })
        .click();
    } else {
      // On a wide screen, today is selected in the chart, so a click on it opens the drawer
      await openTab(page, size, 'chart');
      const chart = page.getByRole('tabpanel', { name: en.tabs.chart });
      await chart
        .getByRole('button', {
          name: labelPattern(en.chartStrip.filledCellLabel, {
            date: TODAY,
            today: en.chartStrip.todaySuffix,
          }),
        })
        .click();
    }
    return settled(page.getByRole('dialog'));
  },
  'export-dialog': async page => settled(await openShareChart(page)),
  settings: async page => {
    const settings = await openSettings(page);
    // The phone page has no slide. The desktop dialog slides as the other dialogs do.
    return settled(settings);
  },
  'version-dialog': async page => {
    // Legal opens the system tab. The release notes change at each release.
    await page.getByRole('contentinfo').getByRole('button', { name: en.footer.legal }).click();
    return settled(page.getByRole('dialog', { name: en.versionTracker.title }));
  },
  'error-screen': async page => {
    // The chunk of the version dialog does not load, so its error boundary shows the alert
    // The idle preload can load the chunk before the route, so the page loads again
    await page.route('**/assets/VersionModal-*.js', route => route.abort());
    await page.reload();
    await page.getByRole('contentinfo').getByRole('button', { name: en.footer.legal }).click();
    return settled(page.getByRole('dialog', { name: en.errorBoundary.title }));
  },
  'welcome-guide': async page => {
    const settings = await openSettings(page);
    await settings.getByRole('button', { name: en.settings.welcomeGuide }).click();
    return settled(page.getByRole('dialog', { name: en.welcomeModal.title }));
  },
};

for (const size of Object.keys(SIZES) as Size[]) {
  test.describe(`Screen layout (${size})`, () => {
    // The service worker keeps the chunks, and a route cannot stop its requests
    test.use({ ...SIZES[size], serviceWorkers: 'block' });

    test.beforeEach(async ({ page }) => {
      await openWithDemo(page);
    });

    for (const tab of Object.keys(en.tabs) as Tab[]) {
      test(`the ${tab} page matches its snapshot`, async ({ page }) => {
        await openTab(page, size, tab);
        await expect(page.locator('body')).toMatchAriaSnapshot({ name: `${tab}-${size}.aria.yml` });
        if (SCREENSHOT_DIR) {
          await page.screenshot({ path: `${SCREENSHOT_DIR}/${tab}-${size}.png`, fullPage: true });
        }
      });
    }

    for (const [screen, open] of Object.entries(openDialog)) {
      test(`the ${screen} matches its snapshot`, async ({ page }) => {
        const dialog = await open(page, size);
        await expect(dialog).toMatchAriaSnapshot({ name: `${screen}-${size}.aria.yml` });
        if (SCREENSHOT_DIR) {
          await page.screenshot({ path: `${SCREENSHOT_DIR}/${screen}-${size}.png` });
        }
      });
    }
  });
}
