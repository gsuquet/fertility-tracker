import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CalendarGrid } from '../CalendarGrid';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider } from '../../context/CycleContext';
import { ObservationDrawer } from '../ObservationDrawer';

const renderCalendarGrid = () => {
  return render(
    <LanguageProvider>
      <CycleProvider>
        <CalendarGrid />
        <ObservationDrawer />
      </CycleProvider>
    </LanguageProvider>
  );
};

describe('CalendarGrid Component', () => {
  it('disables future months navigation button for current month', () => {
    renderCalendarGrid();
    const nextBtn = screen.getByTitle('Future months disabled');
    expect(nextBtn).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();
  });

  it('renders Monday as the first column header of the week', () => {
    const { container } = renderCalendarGrid();
    const headers = container.querySelectorAll('.calendar-weekday-header .weekday-full');
    expect(headers[0]?.textContent).toBe('Mon');
    expect(headers[6]?.textContent).toBe('Sun');
  });

  it('opens observation drawer with clicked date when clicking an empty calendar day', () => {
    renderCalendarGrid();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const dayElement = screen.getByRole('button', { name: new RegExp(`Date ${dateStr}`) });
    expect(dayElement).toBeInTheDocument();

    // Click on day 1
    fireEvent.click(dayElement);

    // The drawer dialog opens in a portal, with the date set to dateStr
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByLabelText(/date/i)).toHaveValue(dateStr);
  });

  it('highlights current day with is-today class and aria-current attribute', () => {
    renderCalendarGrid();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayElement = screen.getByRole('button', { name: new RegExp(`Date ${todayStr}`) });
    expect(todayElement).toBeInTheDocument();
    expect(todayElement).toHaveClass('is-today');
    expect(todayElement).toHaveAttribute('aria-current', 'date');
  });
});
