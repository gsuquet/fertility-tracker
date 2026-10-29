import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { TodayDateNav } from '../TodayDateNav';
import { renderWithProviders } from '../../../test/render';
import { makeObservation } from '../../../test/factories';

const renderNav = (
  props: Partial<Parameters<typeof TodayDateNav>[0]> = {},
  language: 'en' | 'fr' = 'en'
) => {
  const handlers = {
    onPrevDay: vi.fn(),
    onNextDay: vi.fn(),
    onGoToToday: vi.fn(),
    onDateChange: vi.fn(),
  };
  renderWithProviders(
    <TodayDateNav selectedDate="2026-09-02" isToday={true} {...handlers} {...props} />,
    { language }
  );
  return handlers;
};

const dateInput = () => screen.getByDisplayValue('2026-09-02') as HTMLInputElement;

describe('TodayDateNav', () => {
  it('shows the today badge and the not-saved status', () => {
    renderNav();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Not saved')).toBeInTheDocument();
    expect(screen.queryByText(/Day \d/)).toBeNull();
  });

  it('shows the cycle day and the saved status for an observation', () => {
    renderNav({ currentObs: makeObservation({ date: '2026-09-02', cycleDay: 5 }) });
    expect(screen.getByText('Day 5')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows the cycle day of a day with no observation', () => {
    renderNav({ cycleDay: 12 });
    expect(screen.getByText('Day 12')).toBeInTheDocument();
    expect(screen.getByText('Not saved')).toBeInTheDocument();
  });

  it('shows Jump to Today on an earlier day', () => {
    const { onGoToToday } = renderNav({ isToday: false });
    expect(screen.queryByText('Today')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Jump to Today/ }));
    expect(onGoToToday).toHaveBeenCalledOnce();
  });

  it('formats the date in French', () => {
    renderNav({}, 'fr');
    expect(screen.getByText(/septembre/)).toBeInTheDocument();
  });

  it('sends a new date and ignores an empty one', () => {
    const { onDateChange } = renderNav();
    fireEvent.change(dateInput(), { target: { value: '2026-09-05' } });
    expect(onDateChange).toHaveBeenCalledWith('2026-09-05');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
    expect(onDateChange).toHaveBeenCalledTimes(1);
  });

  it('opens the native picker when the browser supports it', () => {
    renderNav();
    const input = dateInput();
    const showPicker = vi.fn();
    input.showPicker = showPicker;
    fireEvent.click(screen.getByText(/2026/));
    expect(showPicker).toHaveBeenCalledOnce();
  });

  it('focuses the input when the picker throws', () => {
    renderNav();
    const input = dateInput();
    input.showPicker = () => {
      throw new Error('not allowed');
    };
    fireEvent.click(screen.getByText(/2026/));
    expect(document.activeElement).toBe(input);
  });

  it('focuses the input when the browser has no picker', () => {
    renderNav();
    const input = dateInput();
    Object.defineProperty(input, 'showPicker', { value: undefined });
    fireEvent.click(screen.getByText(/2026/));
    expect(document.activeElement).toBe(input);
  });
});
