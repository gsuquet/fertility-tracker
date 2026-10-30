import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarGrid } from '../CalendarGrid';
import { useCycle, useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { groupObservationsIntoCycles } from '../../domain/cycleBoundaryDetector';
import { DESKTOP_QUERY } from '../../hooks/useMediaQuery';
import { en, formatMessage } from '../../i18n';
import type { Observation } from '../../types/crms';

// Cycle 1 starts on Jul 22, cycle 2 on Aug 19. The Peak Day of cycle 2 is Aug 31.
const TODAY = '2026-09-15';
const demo = buildDemoObservations(TODAY);
const [current, past] = groupObservationsIntoCycles(demo);

const Probe = () => {
  const { isDrawerOpen, selectedObservation } = useCycleUi();
  const { setSelectedCycleId } = useCycle();
  return (
    <>
      <span data-testid="drawer">
        {`${isDrawerOpen ? 'open' : 'closed'} ${selectedObservation?.date ?? 'none'}`}
      </span>
      <button type="button" onClick={() => setSelectedCycleId('all')}>
        all cycles
      </button>
    </>
  );
};

const renderCalendar = (
  options: { observations?: Observation[]; selectedCycleId?: string } = {},
  props: { onOpenToday?: () => void; onOpenChart?: () => void } = {}
) =>
  renderWithProviders(
    <>
      <CalendarGrid {...props} />
      <Probe />
    </>,
    { observations: demo, ...options }
  );

const day = (date: string) =>
  screen.getByRole('button', { name: new RegExp(`^Date ${date}, `) }) as HTMLElement;
const marks = (date: string) => day(date).querySelector('.calendar-marks')?.textContent;
const previousMonth = () => fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

const mockDesktop = (wide: boolean) =>
  vi.mocked(window.matchMedia).mockImplementation(
    query =>
      ({
        matches: wide && query === DESKTOP_QUERY,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList
  );

describe('CalendarGrid cycles and marks', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
    mockDesktop(false);
  });

  it('shows the first day of a cycle, the Peak Day and the count under the code', () => {
    renderCalendar();
    expect(marks('2026-09-01')).toBe('1');
    expect(day('2026-09-01')).toHaveAccessibleName(/, Post-Peak day 1$/);
    // The stamp no longer carries the count
    expect(day('2026-09-01').querySelector('.post-peak-number')).toBeNull();

    previousMonth();
    expect(day('2026-08-19')).toHaveClass('is-cycle-start');
    expect(marks('2026-08-19')).toBe('C2');
    expect(day('2026-08-19')).toHaveAccessibleName(/, first day of cycle 2$/);
    expect(marks('2026-08-31')).toBe('P');
    expect(day('2026-08-31')).toHaveAccessibleName(/, Peak Day$/);
    expect(day('2026-08-18')).not.toHaveClass('is-cycle-start');
  });

  it('shows the I mark of a day with intercourse', () => {
    renderCalendar({
      observations: [
        makeObservation({ date: '2026-09-01', bleeding: 'H' }),
        makeObservation({
          date: '2026-09-02',
          stretch: '0',
          frequency: 'AD',
          symptoms: ['AP'],
          intercourse: true,
        }),
      ],
    });
    expect(marks('2026-09-02')).toBe('I');
    expect(day('2026-09-02')).toHaveAccessibleName(/, intercourse$/);
    // The code does not repeat the I mark or show the symptoms
    expect(day('2026-09-02')).toHaveAccessibleName(/Observation 0AD I AP, /);
    expect(day('2026-09-02').querySelector('.calendar-code')?.textContent).toBe('0AD');
  });

  it('tints the days of the selected cycle up to today, and names the cycle in the legend', () => {
    renderCalendar();
    expect(day('2026-09-10')).toHaveClass('in-cycle');
    expect(day('2026-09-16')).not.toHaveClass('in-cycle');
    expect(
      screen.getByText(formatMessage(en.calendar.legendCycle, { number: 2 }))
    ).toBeInTheDocument();
    previousMonth();
    expect(day('2026-08-19')).toHaveClass('in-cycle');
    expect(day('2026-08-18')).not.toHaveClass('in-cycle');
  });

  it('opens a past cycle on its first month, and follows the cycle picker', () => {
    renderCalendar({ selectedCycleId: past?.id as string });
    expect(screen.getByRole('heading', { name: 'July 2026' })).toBeInTheDocument();
    expect(day('2026-07-22')).toHaveClass('in-cycle');

    fireEvent.click(screen.getByRole('button', { name: 'all cycles' }));
    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    expect(day('2026-09-10')).not.toHaveClass('in-cycle');
    expect(screen.getByText(en.calendar.legendAll)).toBeInTheDocument();
  });

  it('opens the current cycle on the month of today', () => {
    renderCalendar({ selectedCycleId: current?.id as string });
    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
  });
});

describe('CalendarGrid on a desktop', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
    mockDesktop(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    mockDesktop(false);
  });

  const panel = () => screen.getByRole('region', { name: en.chartStrip.detailLabel });

  it('selects today first and shows it in the day panel', () => {
    renderCalendar();
    expect(day(TODAY)).toHaveAttribute('aria-pressed', 'true');
    expect(day(TODAY)).toHaveClass('is-selected');
    expect(panel()).toHaveTextContent('Cycle 2, day 28');
  });

  it('selects a day with a click instead of opening the drawer, and edits it from the panel', () => {
    renderCalendar();
    fireEvent.click(day('2026-09-10'));
    expect(day('2026-09-10')).toHaveAttribute('aria-pressed', 'true');
    expect(day(TODAY)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('drawer')).toHaveTextContent('closed');
    expect(panel()).toHaveTextContent('Cycle 2, day 23');

    fireEvent.click(within(panel()).getByRole('button', { name: en.chartStrip.editDay }));
    expect(screen.getByTestId('drawer')).toHaveTextContent('open 2026-09-10');
  });

  it('opens the selected day in Today or in the chart', () => {
    const onOpenToday = vi.fn();
    const onOpenChart = vi.fn();
    renderCalendar({}, { onOpenToday, onOpenChart });
    fireEvent.click(day('2026-09-10'));
    fireEvent.click(within(panel()).getByRole('button', { name: en.chartStrip.openInToday }));
    expect(onOpenToday).toHaveBeenCalledOnce();
    expect(screen.getByTestId('drawer')).toHaveTextContent('closed 2026-09-10');

    fireEvent.click(day('2026-09-11'));
    fireEvent.click(within(panel()).getByRole('button', { name: en.chartStrip.openInChart }));
    expect(onOpenChart).toHaveBeenCalledOnce();
    expect(screen.getByTestId('drawer')).toHaveTextContent('closed 2026-09-11');
  });

  it('shows only the date of a day before the first cycle, and a blank day for an empty date', () => {
    const onOpenChart = vi.fn();
    renderCalendar(
      { observations: [makeObservation({ date: '2026-09-10', bleeding: 'H' })] },
      { onOpenChart }
    );
    fireEvent.click(day('2026-09-05'));
    expect(panel()).toHaveTextContent('Sat, Sep 5');
    expect(panel()).not.toHaveTextContent('Cycle');
    fireEvent.click(within(panel()).getByRole('button', { name: en.chartStrip.openInToday }));
    expect(screen.getByTestId('drawer')).toHaveTextContent('closed 2026-09-05');
    fireEvent.click(within(panel()).getByRole('button', { name: en.chartStrip.openInChart }));
    expect(onOpenChart).toHaveBeenCalledOnce();
  });

  it('has no Open in Chart button without its action', () => {
    renderCalendar();
    expect(within(panel()).queryByRole('button', { name: en.chartStrip.openInChart })).toBeNull();
    fireEvent.click(within(panel()).getByRole('button', { name: en.chartStrip.openInToday }));
  });
});
