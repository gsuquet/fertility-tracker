import { screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { CalendarGrid } from '../CalendarGrid';
import { useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';

const DrawerProbe = () => {
  const { isDrawerOpen, selectedObservation } = useCycleUi();
  return (
    <span data-testid="drawer">
      {isDrawerOpen ? `${selectedObservation?.date} ${selectedObservation?.codeString}` : 'closed'}
    </span>
  );
};

const renderCalendar = (
  observations = [makeObservation({ date: '2026-09-10', stretch: '0', codeString: '0' })]
) =>
  renderWithProviders(
    <>
      <CalendarGrid />
      <DrawerProbe />
    </>,
    { observations }
  );

describe('CalendarGrid navigation and selection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves to the previous month and back to the current month', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('August 2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { current: 'date' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Future months disabled' })).toBeDisabled();
  });

  it('marks today and disables future days', () => {
    renderCalendar();
    expect(screen.getByRole('button', { current: 'date' })).toHaveAccessibleName(
      'Date 2026-09-15, No observation'
    );
    expect(screen.getByRole('button', { name: 'Date 2026-09-16, No observation' })).toBeDisabled();
  });

  it('opens the drawer with the saved observation of a day', () => {
    renderCalendar();
    fireEvent.click(
      screen.getByRole('button', { name: 'Date 2026-09-10, Observation 0, first day of cycle 1' })
    );
    expect(screen.getByTestId('drawer')).toHaveTextContent('2026-09-10 0');
  });

  it('opens the drawer with a blank observation for an empty day', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Date 2026-09-11, No observation' }));
    expect(screen.getByTestId('drawer')).toHaveTextContent('2026-09-11');
  });

  it('fills the first and last weeks with the days of the months around', () => {
    renderCalendar([
      makeObservation({ date: '2026-08-20', bleeding: 'H', codeString: 'H' }),
      makeObservation({ date: '2026-09-03', stretch: '0', codeString: '0' }),
    ]);
    // September 2026 starts on a Tuesday and ends on a Wednesday
    const before = screen.getByRole('button', {
      name: 'Date 2026-08-31, No observation, Opens August',
    });
    expect(before).toHaveClass('outside-month');
    expect(before.querySelector('.calendar-add-slot')).toBeNull();
    const after = screen.getByRole('button', { name: 'Date 2026-10-04, No observation' });
    expect(after).toHaveClass('outside-month', 'future-day');
    expect(after).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Date 2026-10-05/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Date 2026-08-30/ })).toBeNull();

    // A click opens the month of the day, and not the drawer
    fireEvent.click(before);
    expect(screen.getByText('August 2026')).toBeInTheDocument();
    expect(screen.getByTestId('drawer')).toHaveTextContent('closed');

    // August ends on a Monday: the last week shows the days of September up to Sunday, muted
    expect(screen.queryByRole('button', { name: /^Date 2026-09-07/ })).toBeNull();
    const saved = screen.getByRole('button', {
      name: 'Date 2026-09-03, Observation 0, Opens September',
    });
    expect(saved).toHaveClass('outside-month');
    expect(saved).not.toHaveClass('in-cycle');
    expect(saved.querySelector('.calendar-code')).toHaveTextContent('0');
    fireEvent.click(saved);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
  });

  it('allows moving forward from a month two years back', () => {
    renderCalendar();
    for (let i = 0; i < 13; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    }
    expect(screen.getByText('August 2025')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('September 2025')).toBeInTheDocument();
  });
});
