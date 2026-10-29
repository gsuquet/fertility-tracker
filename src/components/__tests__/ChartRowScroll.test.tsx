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
 * pixels wide. The cell of today is 48 pixels wide at x 1900, and the Peak Day cell at x 600.
 */
const fakeLayout = () => {
  const rect = (left: number, width: number) => ({ left, width }) as DOMRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    if (this.classList.contains('is-today')) return rect(1900, 48);
    if (this.classList.contains('peak-cell')) return rect(600, 48);
    return rect(20, 340);
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

  it('opens all the rows with today in the middle of the strips, at once', () => {
    const setScrollLeft = fakeLayout();
    renderChart(buildDemoObservations(TODAY), 'all');
    const strips = [...document.querySelectorAll('.chart-row-scroll')];
    expect(strips.length).toBeGreaterThan(1);
    // 1900 - 20 - (340 - 48) / 2: all the rows move, so the same cycle day is in the same column.
    // The test helper selects All Cycles after a first render of the newest cycle.
    expect(setScrollLeft.mock.calls.slice(-strips.length)).toEqual(strips.map(() => [1734]));
    expect(setScrollLeft.mock.contexts.slice(-strips.length)).toEqual(strips);
  });

  it('keeps a past cycle at day 1', () => {
    const setScrollLeft = fakeLayout();
    renderChart(buildDemoObservations(TODAY), 'cycle_2026-07-22');
    expect(screen.getAllByText(new RegExp(`^${en.chartStrip.cycleBadge} \\d$`))).toHaveLength(1);
    const shown = document.querySelector('.chart-row-scroll');
    const index = setScrollLeft.mock.contexts.lastIndexOf(shown);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(setScrollLeft.mock.calls[index]).toEqual([0]);
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
    // The Strip view keeps a card for each day, so today has a cell in both views
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.viewStrip }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.view35 }));
    expect(setScrollLeft.mock.calls).toEqual([[1734], [1734], [1734]]);
  });
});

/** Gives each element its own scroll position, which jsdom does not keep */
const fakeScrollPositions = () => {
  const positions = new WeakMap<Element, number>();
  vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockImplementation(function (this: Element) {
    return positions.get(this) ?? 0;
  });
  vi.spyOn(Element.prototype, 'scrollLeft', 'set').mockImplementation(function (
    this: Element,
    value: number
  ) {
    positions.set(this, value);
  });
};

describe('ChartRow shared scroll', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const strips = () => [...document.querySelectorAll<HTMLElement>('.chart-row-scroll')];

  it('moves all the rows with the row that scrolls', () => {
    fakeScrollPositions();
    renderChart(buildDemoObservations(TODAY), 'all');
    const [first, second] = strips() as [HTMLElement, HTMLElement];
    second.scrollLeft = 500;
    fireEvent.scroll(second);
    expect(first.scrollLeft).toBe(500);
  });

  it('does not move a row back with the scroll event of the sync', () => {
    fakeScrollPositions();
    renderChart(buildDemoObservations(TODAY), 'all');
    const [first, second] = strips() as [HTMLElement, HTMLElement];
    second.scrollLeft = 500;
    fireEvent.scroll(second);
    // The finger moves on before the event of the synced row arrives
    second.scrollLeft = 600;
    fireEvent.scroll(first);
    expect(second.scrollLeft).toBe(600);
    // The next scroll of the first row is a new move
    first.scrollLeft = 100;
    fireEvent.scroll(first);
    expect(second.scrollLeft).toBe(100);
  });

  it('jumps with the controls of the first row', () => {
    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    Object.assign(HTMLElement.prototype, { scrollBy, scrollTo });
    fakeLayout();
    renderChart(buildDemoObservations(TODAY), 'all');
    const [first] = strips();
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.scrollLeft }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.scrollRight }));
    expect(scrollBy.mock.calls).toEqual([
      [{ left: -320, behavior: 'smooth' }],
      [{ left: 320, behavior: 'smooth' }],
    ]);
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.jumpToStart }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.jumpToToday }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.jumpToPeak }));
    // 600 - 20 - (340 - 48) / 2 for the Peak Day
    expect(scrollTo.mock.calls).toEqual([
      [{ left: 0, behavior: 'smooth' }],
      [{ left: 1734, behavior: 'smooth' }],
      [{ left: 434, behavior: 'smooth' }],
    ]);
    expect(scrollBy.mock.contexts).toEqual([first, first]);
    const stripOf = (selector: string) =>
      document.querySelector(selector)?.closest('.chart-row-scroll');
    expect(scrollTo.mock.contexts).toEqual([first, stripOf('.is-today'), stripOf('.peak-cell')]);
  });
});

describe('ChartRow today', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks today only in the cycle that holds it, not in the last days of a past row', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // Day 3 of the current cycle: day 31 of the previous row has the same date, 2026-09-03
    vi.setSystemTime(new Date(2026, 8, 3, 12));
    renderChart(
      [
        makeObservation({ date: '2026-08-04', bleeding: 'H' }),
        makeObservation({ date: '2026-08-20', stretch: '0' }),
        makeObservation({ date: '2026-09-01', bleeding: 'H' }),
      ],
      'all'
    );
    expect(screen.getAllByRole('region')).toHaveLength(2);
    const today = screen.getAllByRole('button', { current: 'date' });
    expect(today).toHaveLength(1);
    const [newest] = screen.getAllByRole('region');
    expect(newest).toContainElement(today[0] as HTMLElement);
  });
});
