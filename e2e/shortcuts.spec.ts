import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

test.describe('Keyboard shortcuts', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('change the page and the day, stay out of the fields, and turn off', async ({ page }) => {
    await openApp(page);
    const date = page.getByRole('textbox', { name: en.labels.date });
    await expect(date).toHaveValue('2026-10-27');

    await page.keyboard.press('ArrowLeft');
    await expect(date).toHaveValue('2026-10-26');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(date).toHaveValue('2026-10-28');
    await page.keyboard.press('t');
    await expect(date).toHaveValue('2026-10-27');

    await page.keyboard.press('2');
    await expect(page.getByRole('tab', { name: en.tabs.chart })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await page.keyboard.press('1');
    await expect(date).toBeVisible();

    // A key typed in a field stays in the field
    await page.getByRole('button', { name: new RegExp(`^${en.observationForm.notes}`) }).click();
    const notes = page.getByPlaceholder(en.todayView.notesPlaceholder);
    await notes.click();
    await page.keyboard.type('n2');
    await expect(notes).toHaveValue('n2');
    await expect(page.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await notes.blur();

    // The dialog lists the keys, has no axe violation and turns the shortcuts off
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog', { name: en.shortcuts.title });
    await expect(dialog).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
    await dialog.getByRole('checkbox', { name: en.shortcuts.enable }).uncheck();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.keyboard.press('3');
    await expect(page.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // The choice stays after a reload: the tabs do not show the keys
    await page.reload();
    await expect(page.getByRole('tab', { name: en.tabs.chart })).toHaveAttribute(
      'title',
      en.tabs.chart
    );
    await page.keyboard.press('3');
    await expect(page.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
