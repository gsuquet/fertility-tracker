import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

/**
 * Axe rules that the application breaks today. The check ignores only these rule ids, so that it
 * passes now and fails on each new violation. Remove a rule id when its correction is merged.
 *
 * The accessibility corrections are tracked in
 * https://github.com/gsuquet/fertility-tracker/issues/34 (modals) and
 * https://github.com/gsuquet/fertility-tracker/issues/35 (hardcoded strings).
 * Neither issue covers the color contrast yet.
 */
const KNOWN_VIOLATIONS: readonly string[] = [
  // Text with a contrast ratio below 4.5:1 in the light theme: the "Direct Code Only" mode
  // button, the danger buttons ("Clear Data / Reset", "Delete Entry"), the footer copyright,
  // the cycle length pill and the symptom tags of the chart, and the section subtitle and
  // the note of the export dialog.
  'color-contrast',
];

const checkAccessibility = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules([...KNOWN_VIOLATIONS])
    .analyze();
  const found = results.violations.map(v => ({
    id: v.id,
    impact: v.impact,
    targets: v.nodes.map(n => n.target.join(' ')),
  }));
  expect(found).toEqual([]);
};

test.describe('Accessibility (axe, WCAG 2 A and AA)', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await page.getByRole('button', { name: en.actions.loadDemo }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  for (const [tab, name] of Object.entries(en.tabs)) {
    test(`the ${tab} view has no new violations`, async ({ page }) => {
      await page.getByRole('tab', { name }).click();
      await expect(page.getByRole('tabpanel', { name })).toBeVisible();
      await checkAccessibility(page);
    });
  }

  test('the export dialog has no new violations', async ({ page }) => {
    await page.getByRole('button', { name: en.actions.exportPdf }).click();
    await expect(page.getByRole('dialog', { name: en.exportModal.title })).toBeVisible();
    await checkAccessibility(page);
  });
});
