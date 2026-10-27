import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

type Screen = keyof typeof en.tabs | 'exportDialog';

const FOOTER_CONTRAST = 'color-contrast .footer-copyright-text';
const DIRECT_MODE_CONTRAST = 'color-contrast button[title="Direct Code Entry Only"] > span';

/**
 * Axe violations that the application has today, as "rule-id target" pairs for each screen.
 * The check fails on a pair that is not in the list, and on a listed pair that does not occur
 * any more. Thus, remove a pair when its correction is merged, and the list gets shorter.
 *
 * All the pairs are text with a contrast ratio below 4.5:1 in the light theme, see
 * https://github.com/gsuquet/fertility-tracker/issues/49. The other accessibility corrections
 * are in https://github.com/gsuquet/fertility-tracker/issues/34 (modals) and
 * https://github.com/gsuquet/fertility-tracker/issues/35 (hardcoded strings).
 */
const KNOWN_VIOLATIONS: Record<Screen, readonly string[]> = {
  today: [DIRECT_MODE_CONTRAST, 'color-contrast .btn-danger > span', FOOTER_CONTRAST],
  chart: ['color-contrast .cycle-length-pill', 'color-contrast .cell-symptom-tag', FOOTER_CONTRAST],
  calendar: [FOOTER_CONTRAST],
  analytics: [FOOTER_CONTRAST],
  exportDialog: [
    DIRECT_MODE_CONTRAST,
    'color-contrast button[aria-label="Delete Entry"] > span',
    FOOTER_CONTRAST,
    'color-contrast .section-subtitle',
    'color-contrast .pdf-info-note',
    'color-contrast .import-restore-section > .btn-danger.btn',
  ],
};

const checkAccessibility = async (page: Page, screen: Screen) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const found = results.violations.flatMap(v => v.nodes.map(n => `${v.id} ${n.target.join(' ')}`));
  expect(found.sort()).toEqual([...KNOWN_VIOLATIONS[screen]].sort());
};

test.describe('Accessibility (axe, WCAG 2 A and AA)', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await page.getByRole('button', { name: en.actions.loadDemo }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  for (const [tab, name] of Object.entries(en.tabs) as [keyof typeof en.tabs, string][]) {
    test(`the ${tab} view has only the known violations`, async ({ page }) => {
      await page.getByRole('tab', { name }).click();
      await expect(page.getByRole('tabpanel', { name })).toBeVisible();
      await checkAccessibility(page, tab);
    });
  }

  test('the export dialog has only the known violations', async ({ page }) => {
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await expect(page.getByRole('dialog', { name: en.exportModal.title })).toBeVisible();
    await checkAccessibility(page, 'exportDialog');
  });
});
