import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TodayView } from '../TodayView';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { DESKTOP_QUERY, WIDE_QUERY } from '../../hooks/useMediaQuery';
import { en } from '../../i18n';
import { useCycle } from '../../context/CycleContext';

/** Shows the cycle that the chart opens on */
const SelectedCycle = () => (
  <output aria-label="selected cycle">{useCycle().selectedCycleId}</output>
);

// Cycle 2 starts on Aug 19, so Sep 15 is its day 28. Its Peak Day is day 13.
const TODAY = '2026-09-15';

const mockWidth = (width: number) =>
  vi.mocked(window.matchMedia).mockImplementation(
    query =>
      ({
        matches:
          (query === DESKTOP_QUERY && width >= 1024) || (query === WIDE_QUERY && width >= 1360),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList
  );

const statusCard = () => document.querySelector('.today-status-card') as HTMLElement;
const recentDays = (count: number) =>
  screen.getByRole('region', { name: `Last ${count} days` }) as HTMLElement;

describe('TodayView on a desktop', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
    mockWidth(390);
  });

  it('shows the status, the current cycle and the last 7 days from 1360 px', () => {
    mockWidth(1440);
    const onOpenChart = vi.fn();
    renderWithProviders(<TodayView onOpenChart={onOpenChart} />, {
      observations: buildDemoObservations(TODAY),
    });

    // No phone banner and no phone history: the right column holds the day
    expect(document.querySelector('.today-top-status-banner')).toBeNull();
    expect(document.querySelector('.today-recent-card')).toBeNull();
    expect(within(statusCard()).getByText(en.todayView.loggedStatus)).toBeInTheDocument();

    expect(
      screen.getByRole('img', { name: 'This cycle: Day 28 of 28 · Peak Day 13' })
    ).toBeInTheDocument();
    expect(document.querySelectorAll('.strip-day')).toHaveLength(35);
    expect(document.querySelector('.strip-day.is-selected')).toHaveTextContent('28');
    fireEvent.click(screen.getByRole('button', { name: en.todayView.openChart }));
    expect(onOpenChart).toHaveBeenCalledOnce();

    const rows = within(recentDays(7)).getAllByRole('button');
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent(/^Mon, Sep 14Day 27/);
    expect(rows[6]).toHaveTextContent(/Tue, Sep 8Day 210AD I$/);
  });

  it('opens a day of the list, and shows the 5 days before it from 1024 px', () => {
    mockWidth(1200);
    renderWithProviders(<TodayView />, { observations: buildDemoObservations(TODAY) });
    expect(screen.queryByRole('img', { name: /^This cycle/ })).toBeNull();
    const rows = within(recentDays(5)).getAllByRole('button');
    expect(rows).toHaveLength(5);

    fireEvent.click(rows[0] as HTMLElement);
    expect(within(recentDays(5)).getAllByRole('button')[0]).toHaveTextContent(/^Sun, Sep 13/);
  });

  it('shows a day that is not saved, and no cycle before the first cycle', () => {
    mockWidth(1440);
    renderWithProviders(<TodayView />, {
      observations: [makeObservation({ date: '2026-09-13', bleeding: 'H' })],
    });
    // Today has no observation: an empty column, and a cycle with no Peak Day yet
    expect(within(statusCard()).getByText(en.todayView.notLoggedStatus)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'This cycle: Day 3 of 3' })).toBeInTheDocument();
    expect(document.querySelectorAll('.strip-day-empty')).toHaveLength(34);
    // No Open the chart without its action
    expect(screen.queryByRole('button', { name: en.todayView.openChart })).toBeNull();

    // Sep 12 is before the first cycle: no cycle, and the list has no cycle day
    fireEvent.click(screen.getByRole('button', { name: en.todayView.prevDay }));
    fireEvent.click(screen.getByRole('button', { name: en.todayView.prevDay }));
    fireEvent.click(screen.getByRole('button', { name: en.todayView.prevDay }));
    expect(screen.queryByRole('img', { name: /^This cycle/ })).toBeNull();
    const first = within(recentDays(7)).getAllByRole('button')[0];
    expect(first).toHaveTextContent(`Fri, Sep 11${en.todayView.noEntryShort}`);
  });

  it('opens the chart on the cycle of the strip', () => {
    mockWidth(1440);
    const onOpenChart = vi.fn();
    const observations = buildDemoObservations(TODAY);
    renderWithProviders(
      <>
        <TodayView onOpenChart={onOpenChart} />
        <SelectedCycle />
      </>,
      { observations }
    );
    // Aug 10 is in cycle 1, which starts on Jul 22
    fireEvent.change(screen.getByLabelText(en.labels.date), { target: { value: '2026-08-10' } });
    expect(screen.getByRole('img', { name: /^This cycle: Day 20 of 28/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.todayView.openChart }));
    expect(onOpenChart).toHaveBeenCalledOnce();
    expect(screen.getByRole('status', { name: 'selected cycle' })).toHaveTextContent(
      'cycle_2026-07-22'
    );
  });

  it('gives a past cycle its length up to the next cycle', () => {
    mockWidth(1440);
    renderWithProviders(<TodayView />, {
      observations: [
        makeObservation({ date: '2026-08-01', bleeding: 'H' }),
        makeObservation({ date: '2026-08-02', stretch: '0' }),
        makeObservation({ date: '2026-08-20', bleeding: 'H' }),
      ],
    });
    // Aug 10 has no observation: cycle 1 runs from Aug 1 to Aug 19
    fireEvent.change(screen.getByLabelText(en.labels.date), { target: { value: '2026-08-10' } });
    expect(screen.getByRole('img', { name: 'This cycle: Day 10 of 19' })).toBeInTheDocument();
  });

  it('shows today for a date after today', () => {
    mockWidth(1440);
    renderWithProviders(<TodayView />, { observations: buildDemoObservations(TODAY) });
    fireEvent.change(screen.getByLabelText(en.labels.date), { target: { value: '2026-09-18' } });
    expect(screen.getByRole('img', { name: /^This cycle: Day 28/ })).toBeInTheDocument();
    const rows = within(recentDays(7)).getAllByRole('button');
    expect(rows[0]).toHaveTextContent(/^Mon, Sep 14Day 27/);
  });
});

describe('TodayView on a phone', () => {
  it('shows the history list under the form', () => {
    mockWidth(390);
    renderWithProviders(<TodayView />, { observations: buildDemoObservations(TODAY) });
    const form = document.querySelector('.today-form-card') as HTMLElement;
    const history = screen.getByRole('heading', { name: en.todayView.recentHistory });
    expect(form.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('region', { name: /^Last \d days/ })).toBeNull();
  });
});
