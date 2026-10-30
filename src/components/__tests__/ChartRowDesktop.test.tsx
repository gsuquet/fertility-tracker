import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartRow } from '../ChartRow';
import { useCycle, useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { DESKTOP_QUERY } from '../../hooks/useMediaQuery';
import { en } from '../../i18n';
import type { Cycle, Observation } from '../../types/crms';
import { addDays } from '../../utils/dateUtils';

const TODAY = '2026-09-15';

const DrawerProbe = () => {
  const { isDrawerOpen, selectedObservation } = useCycleUi();
  const { cycles, setSelectedCycleId } = useCycle();
  return (
    <>
      <span data-testid="drawer">
        {`${isDrawerOpen ? 'open' : 'closed'} ${selectedObservation?.date ?? 'none'}`}
      </span>
      <button type="button" onClick={() => setSelectedCycleId((cycles[0] as Cycle).id)}>
        current cycle only
      </button>
    </>
  );
};

/** True while the window is as wide as a desktop. A change calls the listeners of the query. */
let desktop = true;
const mediaListeners = new Set<() => void>();
const resize = (wide: boolean) => {
  desktop = wide;
  act(() => {
    for (const listener of mediaListeners) listener();
  });
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
    desktop = true;
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({
          get matches() {
            return desktop && query === DESKTOP_QUERY;
          },
          media: query,
          addEventListener: (_type: string, listener: () => void) => mediaListeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) =>
            mediaListeners.delete(listener),
        }) as unknown as MediaQueryList
    );
  });

  afterEach(() => {
    mediaListeners.clear();
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
    expect(past.querySelector('.cycle-stamp-bar')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('title', 'Show only the stamps of cycle 5');
    expect(past.querySelector('.cycle-stamp-bar')).toBeInTheDocument();
    expect(past.querySelector('.cell-code')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(past.querySelector('.cell-code')).toBeNull();
  });

  it('keeps all the days of 4 cycles', () => {
    renderChart(sixCycles().slice(2 * 28));
    expect(screen.queryByRole('button', { name: /^Cycle \d$/, expanded: false })).toBeNull();
  });

  it('keeps an empty live region when today has no card and no day is selected', () => {
    // A past cycle only: today is not in its row
    renderChart(buildDemoObservations(TODAY), 'cycle_2026-07-22');
    expect(screen.queryByRole('region', { name: en.chartStrip.detailLabel })).toBeNull();
    const live = document.querySelector('.chart-day-detail-text[aria-live="polite"]');
    expect(live).toBeEmptyDOMElement();

    // The first selection fills the same live region, so a screen reader reads it
    fireEvent.click(card(/^Cycle Day 13,/));
    expect(detail()).toContainElement(live as HTMLElement);
    expect(live).toHaveTextContent(/Cycle 1, day 13/);
  });

  it('shows the saved day of the next cycle for a card after the end of a cycle', () => {
    renderChart(sixCycles().slice(4 * 28));
    // Day 30 of cycle 1 is day 2 of cycle 2
    const date = addDays(TODAY, -26);
    const [, previous] = screen.getAllByRole('region', { name: /^Cycle \d$/ });
    const after = within(previous as HTMLElement).getByRole('button', { name: /^Day 30 \(/ });
    expect(after).toHaveAccessibleName(`Day 30 (${date}) - Empty`);
    fireEvent.click(after);
    expect(within(detail()).getByText(/Cycle 2, day 2/)).toBeInTheDocument();
    expect(within(detail()).getByText(en.todayView.loggedStatus)).toBeInTheDocument();
    // The cards of the two rows with this date show the selection
    expect(after).toHaveAttribute('aria-pressed', 'true');
    expect(card(new RegExp(`^Cycle Day 2, Date ${date}`))).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not open the sheet when an arrow key lands on the selected day', () => {
    renderChart(buildDemoObservations(TODAY));
    const today = screen.getByRole('button', { current: 'date' });
    // The focus is on the day before today, and the selection stays on today
    const before = today.previousElementSibling as HTMLElement;
    before.focus();
    fireEvent.keyDown(before, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(today);
    expect(drawer()).toBe('closed none');
  });

  it('opens the sheet with a click on the selected day', () => {
    renderChart(buildDemoObservations(TODAY));
    fireEvent.click(screen.getByRole('button', { current: 'date' }));
    expect(drawer()).toBe(`open ${TODAY}`);
  });

  it('shows a saved day with no code as saved, with no fertility sentence', () => {
    renderChart([
      makeObservation({ date: '2026-09-10', bleeding: 'H', codeString: 'H' }),
      makeObservation({ date: '2026-09-12', notes: 'tired' }),
    ]);
    fireEvent.click(card(/^Cycle Day 3,/));
    expect(within(detail()).getByText(en.chartStrip.dayNoCode)).toBeInTheDocument();
    expect(within(detail()).getByText(en.todayView.loggedStatus)).toBeInTheDocument();
    expect(within(detail()).queryByText(en.todayView.noObservation)).toBeNull();
  });

  it('keeps the browser keys with a modifier, and stops at the ends of a row', () => {
    renderChart(buildDemoObservations(TODAY));
    const today = screen.getByRole('button', { current: 'date' });
    today.focus();
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
        [modifier]: true,
      });
      today.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(today);
    }

    const [current] = screen.getAllByRole('region', { name: /^Cycle \d$/ });
    const cards = within(current as HTMLElement).getAllByRole('button', { pressed: false });
    const first = cards[0] as HTMLElement;
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(first);
    const last = cards.at(-1) as HTMLElement;
    last.focus();
    fireEvent.keyDown(last, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(last);
  });

  it('selects today again when the selected day no longer shows', () => {
    renderChart(buildDemoObservations(TODAY));
    const [, previous] = screen.getAllByRole('region', { name: /^Cycle \d$/ });
    fireEvent.click(
      within(previous as HTMLElement).getByRole('button', { name: /^Cycle Day 13,/ })
    );
    expect(within(detail()).getByText(/Cycle 1, day 13/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'current cycle only' }));
    expect(screen.getAllByRole('region', { name: /^Cycle \d$/ })).toHaveLength(1);
    expect(within(detail()).getByText(/Cycle 2, day/)).toBeInTheDocument();
    expect(screen.getByRole('button', { current: 'date' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the sheet again with a click when the window becomes a phone', () => {
    renderChart(buildDemoObservations(TODAY));
    const [, previous] = screen.getAllByRole('region', { name: /^Cycle \d$/ });
    const peak = within(previous as HTMLElement).getByRole('button', { name: /^Cycle Day 13,/ });
    fireEvent.click(peak);

    resize(false);
    expect(peak).not.toHaveAttribute('aria-pressed');
    expect(document.querySelector('.chart-day-detail')).toBeNull();
    fireEvent.click(peak);
    expect(drawer()).toMatch(/^open /);
  });
});
