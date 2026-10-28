import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartRow } from '../ChartRow';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { en } from '../../i18n';
import type { Observation } from '../../types/crms';

const TODAY = '2026-09-15';

/**
 * jsdom has no layout, so this gives one. The strip starts at x 20, shows 340 pixels and is 2000
 * pixels wide. The cell of today is 48 pixels wide at x 1900.
 */
const fakeLayout = () => {
  const rect = (left: number, width: number) => ({ left, width }) as DOMRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('is-today') ? rect(1900, 48) : rect(20, 340);
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(340);
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(2000);
  // The fake cells do not move, so the strip stays at 0 for the next read
  vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockReturnValue(0);
  return vi.spyOn(Element.prototype, 'scrollLeft', 'set');
};

const renderChart = (observations: Observation[], selectedCycleId?: string) =>
  renderWithProviders(<ChartRow />, {
    observations,
    ...(selectedCycleId ? { selectedCycleId } : {}),
  });

describe('ChartRow opening position', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens the current cycle with today in the middle of the strip, at once', () => {
    const setScrollLeft = fakeLayout();
    renderChart(buildDemoObservations(TODAY));
    // 1900 - 20 - (340 - 48) / 2: only the row of the current cycle moves
    expect(setScrollLeft.mock.calls).toEqual([[1734]]);
    expect(setScrollLeft.mock.contexts).toEqual([document.querySelector('.chart-row-scroll')]);
  });

  it('keeps a past cycle at day 1', () => {
    const setScrollLeft = fakeLayout();
    renderChart(buildDemoObservations(TODAY), 'cycle_2026-07-22');
    expect(screen.getAllByText(new RegExp(`^${en.chartStrip.cycleBadge} \\d$`))).toHaveLength(1);
    // The test helper selects the cycle after a first render of all the cycles: only the row of
    // that first render, now removed, moved
    const shown = document.querySelector('.chart-row-scroll');
    expect(shown).not.toBeNull();
    expect(setScrollLeft.mock.contexts).not.toContain(shown);
  });

  it('opens the current cycle at its end when today has no cell', () => {
    const setScrollLeft = fakeLayout();
    // Today is day 77, after the 35 cells of the grid
    renderChart([
      makeObservation({ date: '2026-07-01', bleeding: 'H' }),
      makeObservation({ date: '2026-07-02', stretch: '0' }),
    ]);
    expect(screen.queryByRole('button', { current: 'date' })).toBeNull();
    expect(setScrollLeft.mock.calls).toEqual([[2000]]);
  });

  it('moves to today again each time the view mode changes the cells', () => {
    const setScrollLeft = fakeLayout();
    renderChart([
      makeObservation({ date: '2026-09-01', bleeding: 'H' }),
      makeObservation({ date: '2026-09-10', stretch: '0' }),
    ]);
    // In the compact strip, today has no observation and thus no cell
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.compactGrid }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.fullGrid }));
    expect(setScrollLeft.mock.calls).toEqual([[1734], [2000], [1734]]);
  });
});
