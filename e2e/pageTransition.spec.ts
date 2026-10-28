import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { openApp } from './fixtures';

/**
 * Records each view transition that the app starts: its direction, the name of the header in it,
 * and the page before and after its update.
 */
const recordTransitions = async (page: Page) => {
  await page.addInitScript(() => {
    const transitions: string[] = [];
    const durations: number[] = [];
    Object.assign(window, { transitions, durations });
    const panel = () => document.querySelector('[role="tabpanel"]')?.id;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (update?: ViewTransitionUpdateCallback) => {
      const header = document.querySelector('.app-header') as HTMLElement;
      const name = getComputedStyle(header).viewTransitionName;
      const before = panel();
      const transition = start(async () => {
        await update?.();
        const after = panel();
        transitions.push(
          `${document.documentElement.dataset.pageTransition} ${name} ${before}>${after}`
        );
      });
      // The longest animation of the transition, from the timing that the CSS gives
      void transition.ready.then(() => {
        const timings = document
          .getAnimations()
          .map(animation => animation.effect as KeyframeEffect)
          .filter(effect => effect.pseudoElement?.startsWith('::view-transition'))
          .map(effect => Number(effect.getComputedTiming().endTime));
        durations.push(Math.max(...timings));
      });
      return transition;
    };
  });
};

const transitions = (page: Page) =>
  page.evaluate(() => (window as unknown as { transitions: string[] }).transitions);

const openTab = async (page: Page, name: string) => {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('tabpanel', { name })).toBeVisible();
};

test.describe('Page slide', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('slides in the page order, and the header stays in place', async ({ page }) => {
    await recordTransitions(page);
    await openApp(page);
    await openTab(page, en.tabs.calendar);
    await openTab(page, en.tabs.chart);
    await expect
      .poll(() => transitions(page))
      .toEqual([
        'forward app-header today-panel>calendar-panel',
        'back app-header calendar-panel>chart-panel',
      ]);
    // Each part of the transition takes 180 ms
    const durations = await page.evaluate(
      () => (window as unknown as { durations: number[] }).durations
    );
    expect(durations.length).toBeGreaterThan(0);
    expect(durations).toEqual(durations.map(() => 180));
    // Out of a transition, the header has no name, so it makes no stacking context
    await expect(page.locator('.app-header')).toHaveCSS('view-transition-name', 'none');
    // The analytics page slides only after its first load
    await openTab(page, en.tabs.analytics);
    await openTab(page, en.tabs.today);
    await openTab(page, en.tabs.analytics);
    await expect
      .poll(async () => (await transitions(page)).map(entry => entry.split(' ')[0]))
      .toEqual(['forward', 'back', 'back', 'forward']);
    // Back goes to the page on the left
    await page.goBack();
    await expect(page.getByRole('tabpanel', { name: en.tabs.today })).toBeVisible();
    await expect
      .poll(async () => (await transitions(page)).at(-1))
      .toBe('back app-header analytics-panel>today-panel');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.pageTransition))
      .toBeUndefined();
  });

  test('changes the page at once with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordTransitions(page);
    await openApp(page);
    await openTab(page, en.tabs.chart);
    await openTab(page, en.tabs.today);
    expect(await transitions(page)).toEqual([]);
  });
});
