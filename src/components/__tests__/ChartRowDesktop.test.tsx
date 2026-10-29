import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartRow } from '../ChartRow';
import { useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { DESKTOP_QUERY } from '../../hooks/useMediaQuery';
import { en } from '../../i18n';
import type { Observation } from '../../types/crms';
import { addDays } from '../../utils/dateUtils';

const TODAY = '2026-09-15';

const DrawerProbe = () => {
  const { isDrawerOpen, selectedObservation } = useCycleUi();
  return (
    <span data-testid="drawer">
      {`${isDrawerOpen ? 'open' : 'closed'} ${selectedObservation?.date ?? 'none'}`}
    </span>
  );
};

const renderChart = (observations: Observation[], selectedCycleId = 'all') => {
  const onOpenToday = vi.fn();
  renderWithProviders(
    <>
      <ChartRow onOpenToday={onOpenToday} />
      <DrawerProbe />
    </>,
    { observations, selectedCycleId }
  );
  return onOpenToday;
};

const drawer = () => screen.getByTestId('drawer').textContent;
const detail = () => screen.getByRole('region', { name: en.chartStrip.detailLabel });
const card = (name: RegExp) => screen.getByRole('button', { name });

/** Six cycles of 28 days that end today, newest first in the chart */
const sixCycles = () =>
  Array.from({ length: 6 * 28 }, (_, i) => {
    const date = addDays(TODAY, i - 6 * 28 + 1);
    return i % 28 === 0
      ? makeObservation({ date, bleeding: 'H' })
      : makeObservation({ date, stretch: '0' });
  });

describe('ChartRow on a desktop', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({
          matches: query === DESKTOP_QUERY,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
  });

  it('selects today when the chart opens, and shows it in the detail bar', () => {
    renderChart(buildDemoObservations(TODAY));
    const today = screen.getByRole('button', { current: 'date' });
    expect(today).toHaveAttribute('aria-pressed', 'true');
    expect(within(detail()).getByText(/Cycle 2, day/)).toBeInTheDocument();
    expect(within(detail()).getByText(new RegExp(en.todayView.loggedStatus))).toBeInTheDocument();
  });

  it('selects a day with a click and does not open the sheet', () => {
    renderChart(buildDemoObservations(TODAY));
    const [, previous] = screen.getAllByRole('region', { name: /^Cycle \d$/ });
    const peak = within(previous as HTMLElement).getByRole('button', { name: /^Cycle Day 13,/ });
    fireEvent.click(peak);
    expect(drawer()).toBe('closed none');
    expect(peak).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { current: 'date' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(within(detail()).getByText(/Cycle 1, day 13/)).toBeInTheDocument();
    expect(
      within(detail()).getByText(en.todayView.guidance.whiteBaby, { exact: false })
    ).toBeTruthy();
  });

  it('opens the selected day in the sheet with Edit, and in Today with Open in Today', () => {
    const onOpenToday = renderChart([
      makeObservation({ date: '2026-09-10', bleeding: 'H', codeString: 'H', notes: 'cramps' }),
    ]);
    fireEvent.click(card(/^Cycle Day 1, Date 2026-09-10/));
    expect(within(detail()).getByText('H')).toBeInTheDocument();
    expect(within(detail()).getByText('cramps')).toBeInTheDocument();

    fireEvent.click(within(detail()).getByRole('button', { name: en.chartStrip.openInToday }));
    expect(onOpenToday).toHaveBeenCalledOnce();
    expect(drawer()).toBe('closed 2026-09-10');

    fireEvent.click(within(detail()).getByRole('button', { name: en.chartStrip.editDay }));
    expect(drawer()).toBe('open 2026-09-10');
  });

  it('shows an empty day with the empty stamp and a draft for the sheet', () => {
    renderChart([makeObservation({ date: '2026-09-10', bleeding: 'H', codeString: 'H' })]);
    fireEvent.click(card(/^Day 3 \(2026-09-12\) - Empty/));
    expect(within(detail()).getByText(new RegExp(en.todayView.noObservation))).toBeInTheDocument();
    expect(
      within(detail()).getByText(new RegExp(en.todayView.notLoggedStatus))
    ).toBeInTheDocument();
    expect(detail().querySelector('.stamp-empty')).toBeInTheDocument();
    fireEvent.click(within(detail()).getByRole('button', { name: en.chartStrip.editDay }));
    expect(drawer()).toBe('open 2026-09-12');
  });

  it('moves the selection and the focus with the arrow keys', () => {
    renderChart(buildDemoObservations(TODAY));
    const today = screen.getByRole('button', { current: 'date' });
    today.focus();
    fireEvent.keyDown(today, { key: 'ArrowLeft' });
    const left = document.activeElement as HTMLElement;
    expect(left).toHaveAttribute('aria-pressed', 'true');
    expect(left).not.toBe(today);

    // Down goes to the same cycle day of the next row
    fireEvent.keyDown(left, { key: 'ArrowDown' });
    const below = document.activeElement as HTMLElement;
    const [, previous] = screen.getAllByRole('region', { name: /^Cycle \d$/ });
    expect(previous).toContainElement(below);
    expect(below.querySelector('.cell-day-num')?.textContent).toBe(
      left.querySelector('.cell-day-num')?.textContent
    );

    // The last row has no row below, and other keys do nothing
    fireEvent.keyDown(below, { key: 'ArrowDown' });
    fireEvent.keyDown(below, { key: 'Enter' });
    expect(document.activeElement).toBe(below);
    fireEvent.keyDown(below, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(left);
    fireEvent.keyDown(left, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(today);
  });

  it('ignores the arrow keys outside the day cards', () => {
    renderChart(buildDemoObservations(TODAY));
    const start = screen.getByRole('button', { name: en.chartStrip.jumpToStart });
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(start);
  });

  it('shows only the stamps of the past cycles of a chart with more than 4 cycles', () => {
    renderChart(sixCycles());
    const rows = screen.getAllByRole('region', { name: /^Cycle \d$/ });
    expect(rows).toHaveLength(6);
    // The current cycle has no toggle and its full cards
    expect(within(rows[0] as HTMLElement).queryByRole('button', { name: /^Cycle \d$/ })).toBeNull();
    expect((rows[0] as HTMLElement).querySelector('.cell-code')).toBeInTheDocument();
    const past = rows[1] as HTMLElement;
    expect(past.querySelector('.cell-code')).toBeNull();

    const toggle = within(past).getByRole('button', { name: 'Cycle 5', expanded: false });
    expect(toggle).toHaveAttribute('title', 'Show all the days of cycle 5');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(past.querySelector('.cell-code')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(past.querySelector('.cell-code')).toBeNull();
  });

  it('keeps all the days of 4 cycles', () => {
    renderChart(sixCycles().slice(2 * 28));
    expect(screen.queryByRole('button', { name: /^Cycle \d$/, expanded: false })).toBeNull();
  });

  it('shows no detail bar when today has no card and no day is selected', () => {
    // A past cycle only: today is not in its row
    renderChart(buildDemoObservations(TODAY), 'cycle_2026-07-22');
    expect(screen.queryByRole('region', { name: en.chartStrip.detailLabel })).toBeNull();
  });
});
