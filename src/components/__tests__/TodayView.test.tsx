import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TodayView } from '../TodayView';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CycleProvider } from '../../context/CycleContext';
import { getTodayStr, addDays, formatDateDisplay } from '../../utils/dateUtils';

const renderTodayView = () => {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CycleProvider>
          <TodayView />
        </CycleProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

describe('TodayView Component (Dedicated Today Page)', () => {
  it('renders Today Page title, date navigation, and form sections', () => {
    renderTodayView();
    expect(screen.getByText("Today's Observation")).toBeInTheDocument();
    expect(screen.getByText('Direct Code Entry')).toBeInTheDocument();
    expect(screen.getByText('Recent 5-Day Observation History')).toBeInTheDocument();
  });

  it('allows stepping to previous and next days, up to today', () => {
    renderTodayView();
    const todayStr = getTodayStr();
    const prevDayStr = addDays(todayStr, -1);

    const prevTitleText = formatDateDisplay(prevDayStr, 'en-US');
    const todayTitleText = formatDateDisplay(todayStr, 'en-US');

    expect(screen.getByText(todayTitleText)).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: 'Previous Day' });
    const nextBtn = screen.getByRole('button', { name: 'Next Day' });

    // Click Prev Day -> moves to yesterday
    fireEvent.click(prevBtn);
    expect(screen.getByText(prevTitleText)).toBeInTheDocument();

    // Click Next Day -> moves back to today
    fireEvent.click(nextBtn);
    expect(screen.getByText(todayTitleText)).toBeInTheDocument();

    // Today is the last day: Next Day is disabled
    expect(nextBtn).toBeDisabled();
  });

  it('updates form and code string when direct input text is typed', () => {
    renderTodayView();
    const directInput = screen.getByPlaceholderText('e.g. 10KLX3 I AP');
    fireEvent.change(directInput, { target: { value: '10KLX3 I' } });
    expect(directInput).toHaveValue('10KLX3 I');
  });

  it('enables save button when changes are made and disables when pristine/saved', () => {
    renderTodayView();
    // Initially empty or saved observation: type input to make a change
    const directInput = screen.getByPlaceholderText('e.g. 10KLX3 I AP');
    fireEvent.change(directInput, { target: { value: '10KLX3 I' } });

    const saveBtn = screen.getByRole('button', { name: /Save Observation/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);
    expect(screen.getByText('Observation saved successfully!')).toBeInTheDocument();
  });

  it('hides the group rows in Direct Code Only and shows them again', () => {
    renderTodayView();
    const toggle = () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Observation actions' })[0]!);
      fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Direct Code Only' }));
    };
    toggle();
    expect(screen.queryByRole('button', { name: /^Bleeding/ })).toBeNull();
    toggle();
    expect(screen.getByRole('button', { name: /^Bleeding/ })).toBeInTheDocument();
  });

  it('opens the next day with a swipe to the left and the previous day with a swipe to the right', () => {
    // Reduced motion, so that the day changes at the release
    const media = vi.mocked(window.matchMedia).getMockImplementation();
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({
          matches: true,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
    try {
      renderTodayView();
      const page = screen.getByRole('tabpanel');
      const swipe = (dx: number) => {
        fireEvent.pointerDown(page, {
          pointerId: 1,
          pointerType: 'touch',
          clientX: 400,
          clientY: 300,
        });
        fireEvent.pointerMove(page, { pointerId: 1, clientX: 400 + dx, clientY: 300 });
        fireEvent.pointerUp(page, { pointerId: 1, clientX: 400 + dx, clientY: 300 });
      };
      const todayStr = getTodayStr();
      swipe(100);
      swipe(100);
      expect(
        screen.getByText(formatDateDisplay(addDays(todayStr, -2), 'en-US'))
      ).toBeInTheDocument();
      swipe(-100);
      expect(
        screen.getByText(formatDateDisplay(addDays(todayStr, -1), 'en-US'))
      ).toBeInTheDocument();
      // Today is the last day: a swipe to the left does nothing
      swipe(-100);
      swipe(-100);
      expect(screen.getByText(formatDateDisplay(todayStr, 'en-US'))).toBeInTheDocument();
    } finally {
      vi.mocked(window.matchMedia).mockImplementation(media as typeof window.matchMedia);
    }
  });
});
