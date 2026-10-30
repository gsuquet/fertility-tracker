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
    vi.restoreAllMocks();
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
    expect(today.querySelector('.cell-code')?.textContent).toBe('');
    // Day 3 of the count of three keeps its stamp without a code
    expect(today.querySelector('.stamp-light_green_baby_3')).toBeInTheDocument();
    expect(today.querySelector('.stamp-empty')).toBeNull();
    expect(
      within(today).getByTitle(`${en.chartStrip.notesTooltip}: notes only`)
    ).toBeInTheDocument();
    const blankNotes = screen.getByRole('button', { name: /Date 2026-09-13/ });
    expect(blankNotes.querySelector('.cell-notes-icon')).toBeNull();
    const fertile = screen.getByRole('button', { name: /Date 2026-09-12/ });
    expect(within(fertile).getByTitle('Symptoms: AP')).toBeInTheDocument();
    // The stamp shows the I mark and the tag shows the symptom, so the code does not repeat them
    expect(
      [...fertile.querySelectorAll('.cell-code-token')].map(token => token.textContent)
    ).toEqual(['10KL']);
  });

  it('puts each token of a code on its own line', () => {
    renderChart([
      makeObservation({ date: '2026-09-15', bleeding: 'L', stretch: '6', modifiers: ['C'] }),
    ]);
    const today = screen.getByRole('button', { current: 'date' });
    expect([...today.querySelectorAll('.cell-code-token')].map(token => token.textContent)).toEqual(
      ['L', '6C']
    );
  });

  it('shows only the cycle day and the stamp in the Strip view', () => {
    renderChart(rich);
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.viewStrip }));
    const today = screen.getByRole('button', { current: 'date' });
    expect(today.querySelector('.cell-day-num')?.textContent).toBe('6');
    expect(today.querySelector('.stamp-badge')).toBeInTheDocument();
    expect(today.querySelector('.cell-code')).toBeNull();
    expect(today.querySelector('.cell-date')).toBeNull();
    // The Strip view keeps the empty days, so the columns stay aligned by cycle day
    expect(
      screen.getByRole('button', { name: /^Day 5 \(2026-09-14\) - Empty/ })
    ).toBeInTheDocument();
  });

  it('marks today on an empty day of a cycle', () => {
    renderChart(rich.slice(0, 4));
    const today = screen.getByRole('button', { current: 'date' });
    expect(today).toHaveAccessibleName(
      'Day 6 (2026-09-15) - Empty, Today. Click to add observation.'
    );
    expect(within(today).queryByText('Today')).toBeNull();
    expect(within(today).getByText('09-15')).toBeInTheDocument();
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

  it('gives each day of the stamp bar its code', () => {
    renderChart(rich);
    for (const title of ['Day 1: H', 'Day 2: B 2', 'Day 4: 0', 'Day 5', 'Day 6: None']) {
      expect(screen.getByTitle(title)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.optionsLabel }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: en.chartStrip.stampBar }));
    expect(screen.queryByTitle('Day 5')).toBeNull();
  });

  it('gives each segment of the stamp bar the stamp of its day card', () => {
    renderChart([...buildDemoObservations('2026-09-15'), ...rich.slice(4)]);
    const [current] = screen.getAllByRole('region') as [HTMLElement];
    const segments = [...current.querySelectorAll('.stamp-segment')];
    const cards = [...current.querySelectorAll('.chart-cell')];
    expect(segments).toHaveLength(cards.length);
    const seen = new Set<string>();
    cards.forEach((card, idx) => {
      const badge = card.querySelector('.stamp-badge');
      const stamp = !badge
        ? 'none'
        : badge.classList.contains('stamp-empty')
          ? 'empty'
          : (
              [...badge.classList].find(
                c => c.startsWith('stamp-') && !['stamp-badge', 'stamp-peak'].includes(c)
              ) ?? ''
            ).slice('stamp-'.length);
      seen.add(stamp);
      expect(segments[idx]).toHaveClass(`segment-${stamp}`);
    });
    // The demo cycle has each kind of stamp, a day with no code and a day to come
    expect([...seen].sort()).toEqual([
      'dark_green',
      'empty',
      'light_green_baby_1',
      'light_green_baby_2',
      'light_green_baby_3',
      'none',
      'red',
      'white_baby',
    ]);
  });

  it('shows the controls on the first cycle only', () => {
    renderChart(buildDemoObservations('2026-09-15'));
    expect(screen.getAllByRole('button', { name: en.chartStrip.jumpToStart })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: en.chartStrip.scrollRight })).toHaveLength(1);
  });

  it('shows no Today and no P button when the rows have no such cell', () => {
    // Today is cycle day 97, after the 35 days of the row
    vi.setSystemTime(new Date(2026, 11, 15, 12));
    renderChart([makeObservation({ date: '2026-09-10', bleeding: 'H' })]);
    expect(screen.getByRole('button', { name: en.chartStrip.jumpToStart })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.chartStrip.jumpToToday })).toBeNull();
    expect(screen.queryByRole('button', { name: en.chartStrip.jumpToPeak })).toBeNull();
  });

  it('shows only the selected cycle and switches the view mode', () => {
    const demo = buildDemoObservations('2026-09-15');
    renderChart(demo, 'cycle_2026-07-22');
    expect(screen.getAllByText(new RegExp(`^${en.chartStrip.cycleBadge} \\d$`))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.viewStrip }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.view35 }));
    fireEvent.click(screen.getByRole('button', { name: en.chartStrip.showLegend }));
    expect(screen.getByRole('button', { name: en.chartStrip.hideLegend })).toBeInTheDocument();
  });
});
