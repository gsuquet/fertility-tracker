import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { ChartRow } from '../ChartRow';
import { useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { en } from '../../i18n';
import type { Observation } from '../../types/crms';

const DrawerProbe = () => {
  const { isDrawerOpen, selectedObservation } = useCycleUi();
  return (
    <span data-testid="drawer">
      {isDrawerOpen
        ? `${selectedObservation?.date} day ${selectedObservation?.cycleDay} ${selectedObservation?.codeString}`
        : 'closed'}
    </span>
  );
};

const renderChart = (observations?: Observation[], selectedCycleId?: string) =>
  renderWithProviders(
    <>
      <ChartRow />
      <DrawerProbe />
    </>,
    { ...(observations ? { observations } : {}), ...(selectedCycleId ? { selectedCycleId } : {}) }
  );

const drawer = () => screen.getByTestId('drawer').textContent;

// A short cycle that ends today with one day of each kind
const rich = [
  makeObservation({ date: '2026-09-10', bleeding: 'H' }),
  makeObservation({ date: '2026-09-11', bleeding: 'B', stretch: '2' }),
  makeObservation({
    date: '2026-09-12',
    stretch: '10',
    modifiers: ['K', 'L'],
    symptoms: ['AP'],
    intercourse: true,
    notes: 'stretchy',
  }),
  makeObservation({ date: '2026-09-13', stretch: '0', notes: '   ' }),
  makeObservation({ date: '2026-09-15', notes: 'notes only' }),
];

describe('ChartRow interactions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens an empty day of the empty grid', () => {
    renderChart();
    fireEvent.click(screen.getByRole('button', { name: 'Day 3 (2026-09-17) - Empty' }));
    expect(drawer()).toBe('2026-09-17 day 3 0AD');
  });

  // A native button opens with Enter and Space in the browser: jsdom does not do this
  const expectNativeButton = (cell: HTMLElement) => {
    expect(cell.tagName).toBe('BUTTON');
    expect(cell).toHaveAttribute('type', 'button');
  };

  it('makes each empty day of the empty grid a native button', () => {
    renderChart();
    const cell = screen.getByRole('button', { name: 'Day 2 (2026-09-16) - Empty' });
    expectNativeButton(cell);
    fireEvent.keyDown(cell, { key: 'a' });
    expect(drawer()).toBe('closed');
  });

  it('toggles the legend of the empty grid', () => {
    renderChart();
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.showLegend }));
    expect(screen.getByText('Creighton Model Chart Stamp Key:')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.hideLegend }));
    expect(screen.queryByText('Creighton Model Chart Stamp Key:')).toBeNull();
  });

  it('opens a saved day, a native button, with a click', () => {
    renderChart(rich);
    const cell = screen.getByRole('button', { name: /^Cycle Day 1, Date 2026-09-10/ });
    expectNativeButton(cell);
    fireEvent.keyDown(cell, { key: 'a' });
    expect(drawer()).toBe('closed');
    fireEvent.click(cell);
    expect(drawer()).toBe('2026-09-10 day 1 H');
  });

  it('opens a gap day, a native button, with a click', () => {
    renderChart(rich);
    const gap = screen.getByRole('button', { name: /^Day 5 \(2026-09-14\) - Empty/ });
    expectNativeButton(gap);
    fireEvent.keyDown(gap, { key: 'Tab' });
    expect(drawer()).toBe('closed');
    fireEvent.click(gap);
    expect(drawer()).toBe('2026-09-14 day 5 0AD');
  });

  it('marks today, a missing code and notes on the cells', () => {
    renderChart(rich);
    const today = screen.getByRole('button', { current: 'date' });
    expect(today).toHaveAccessibleName(/Code None, Today$/);
    expect(within(today).getByText('---')).toBeInTheDocument();
    expect(
      within(today).getByTitle(`${en.chartStrip.notesTooltip}: notes only`)
    ).toBeInTheDocument();
    const blankNotes = screen.getByRole('button', { name: /Date 2026-09-13/ });
    expect(blankNotes.querySelector('.cell-notes-icon')).toBeNull();
    const fertile = screen.getByRole('button', { name: /Date 2026-09-12/ });
    expect(within(fertile).getByTitle('Symptoms: AP')).toBeInTheDocument();
  });

  it('marks today on an empty day of a cycle', () => {
    renderChart(rich.slice(0, 4));
    const today = screen.getByRole('button', { current: 'date' });
    expect(today).toHaveAccessibleName(
      'Day 6 (2026-09-15) - Empty, Today. Click to add observation.'
    );
    expect(within(today).getByText('Today')).toBeInTheDocument();
  });

  it('shows the details of a cell on hover and focus', () => {
    renderChart(rich);
    const fertile = screen.getByRole('button', { name: /Date 2026-09-12/ });
    fireEvent.mouseEnter(fertile);
    const popover = fertile.querySelector('.cell-hover-popover') as HTMLElement;
    expect(within(popover).getByText('10KL I AP')).toBeInTheDocument();
    expect(within(popover).getByText('K, L')).toBeInTheDocument();
    expect(within(popover).getByText('Yes (I)')).toBeInTheDocument();
    expect(within(popover).getByText('"stretchy"')).toBeInTheDocument();
    fireEvent.mouseLeave(fertile);
    expect(fertile.querySelector('.cell-hover-popover')).toBeNull();

    const bleeding = screen.getByRole('button', { name: /Date 2026-09-11/ });
    fireEvent.focus(bleeding);
    const bleedingPopover = bleeding.querySelector('.cell-hover-popover') as HTMLElement;
    expect(within(bleedingPopover).getByText('B')).toBeInTheDocument();
    expect(within(bleedingPopover).queryByText('Modifiers:')).toBeNull();
    fireEvent.blur(bleeding);
    expect(bleeding.querySelector('.cell-hover-popover')).toBeNull();

    const notesOnly = screen.getByRole('button', { current: 'date' });
    fireEvent.mouseEnter(notesOnly);
    expect(within(notesOnly).getByText('---', { selector: '.popover-val' })).toBeInTheDocument();
  });

  it('labels each phase on the timeline', () => {
    renderChart(rich);
    for (const title of [
      `Day 1: ${en.chartStrip.phaseMenses}`,
      `Day 2: ${en.chartStrip.phaseMenses}`,
      `Day 3: ${en.chartStrip.phasePeak} (P)`,
      `Day 4: ${en.chartStrip.phasePostPeak}`,
      'Day 5',
    ]) {
      expect(screen.getByTitle(title)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Phases' }));
    expect(screen.queryByTitle('Day 5')).toBeNull();
  });

  it('labels fertile and dry days on the timeline', () => {
    renderChart(buildDemoObservations('2026-09-15'));
    expect(screen.getByTitle('Day 12: Fertile Mucus')).toBeInTheDocument();
    expect(screen.getByTitle('Day 20: Dry / Infertile')).toBeInTheDocument();
  });

  it('scrolls the row and jumps to its start, peak and end', () => {
    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    const scrollIntoView = vi.fn();
    Object.assign(HTMLElement.prototype, { scrollBy, scrollTo, scrollIntoView });
    renderChart(rich);
    fireEvent.click(screen.getByRole('button', { name: 'Scroll left' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scroll right' }));
    expect(scrollBy.mock.calls).toEqual([
      [{ left: -320, behavior: 'smooth' }],
      [{ left: 320, behavior: 'smooth' }],
    ]);
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.jumpToStart }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.jumpToLatest }));
    expect(scrollTo).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'P' }));
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  it('shows only the selected cycle and switches the view mode', () => {
    const demo = buildDemoObservations('2026-09-15');
    renderChart(demo, 'cycle_2026-07-22');
    expect(screen.getAllByText(new RegExp(`^${en.chartStrip.cycleBadge} \\d$`))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.compactGrid }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.fullGrid }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.showLegend }));
    expect(screen.getByRole('button', { name: en.chartStrip.hideLegend })).toBeInTheDocument();
  });
});
