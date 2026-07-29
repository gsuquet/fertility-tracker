import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CalendarGrid } from '../CalendarGrid';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider } from '../../context/CycleContext';

const renderCalendarGrid = () => {
  return render(
    <LanguageProvider>
      <CycleProvider>
        <CalendarGrid />
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
    expect(headers[0].textContent).toBe('Mon');
    expect(headers[6].textContent).toBe('Sun');
  });
});
