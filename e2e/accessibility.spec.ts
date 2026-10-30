import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { loadDemoData, openApp, openSettings, openShareChart } from './fixtures';

type Screen = keyof typeof en.tabs | 'exportDialog' | 'settings';

/**
 * Axe violations that the application has today, as "rule-id target" pairs for each screen.
 * The check fails on a pair that is not in the list, and on a listed pair that does not occur
 * any more. The lists are empty: each screen has no WCAG 2 A or AA violation. Add a pair only
 * with a link to the issue that will correct it.
 */
const KNOWN_VIOLATIONS: Record<Screen, readonly string[]> = {
  today: [],
  chart: [],
  calendar: [],
  analytics: [],
  exportDialog: [],
  settings: [],
};

const checkAccessibility = async (page: Page, screen: Screen) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const found = results.violations.flatMap(v => v.nodes.map(n => `${v.id} ${n.target.join(' ')}`));
  expect(found.sort()).toEqual([...KNOWN_VIOLATIONS[screen]].sort());
};

test.describe('Accessibility (axe, WCAG 2 A and AA)', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await loadDemoData(page);
  });

  for (const [tab, name] of Object.entries(en.tabs) as [keyof typeof en.tabs, string][]) {
    test(`the ${tab} view has only the known violations`, async ({ page }) => {
      await page.getByRole('tab', { name }).click();
      await expect(page.getByRole('tabpanel', { name })).toBeVisible();
      await checkAccessibility(page, tab);
    });
  }

  test('the export dialog has only the known violations', async ({ page }) => {
    await openShareChart(page);
    await checkAccessibility(page, 'exportDialog');
  });

  test('Settings has only the known violations', async ({ page }) => {
    await openSettings(page);
    await checkAccessibility(page, 'settings');
  });
});
