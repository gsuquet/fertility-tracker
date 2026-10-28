import { act, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { CalendarGrid } from '../CalendarGrid';
import { renderWithProviders } from '../../test/render';

/** A finger that moves from x = 200 by `dx` pixels in 300 milliseconds, then lifts. */
const swipe = (dx: number) => {
  const page = screen.getByRole('tabpanel');
  fireEvent.pointerDown(page, { pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 300 });
  for (const part of [0.5, 1]) {
    vi.advanceTimersByTime(150);
    fireEvent.pointerMove(page, { pointerId: 1, clientX: 200 + dx * part, clientY: 300 });
  }
  fireEvent.pointerUp(page, { pointerId: 1, clientX: 200 + dx, clientY: 300 });
};

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const grid = () => document.querySelector('.calendar-grid') as HTMLElement;

describe('CalendarGrid swipe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the previous month after a swipe to the right, and the next after a swipe to the left', async () => {
    renderWithProviders(<CalendarGrid />);
    swipe(150);
    // The days grid slides out, the header stays
    expect(grid().style.transform).toBe('translateX(30%)');
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    await wait(150);
    expect(screen.getByText('August 2026')).toBeInTheDocument();

    swipe(-150);
    await wait(150);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
  });

  it('never goes past the current month', async () => {
    renderWithProviders(<CalendarGrid />);
    swipe(-150);
    expect(grid().style.transform).toBe('');
    await wait(500);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
  });

  it('moves two months after two fast swipes, and stops at the current month', async () => {
    renderWithProviders(<CalendarGrid />);
    swipe(150);
    swipe(150);
    await wait(150);
    expect(screen.getByText('July 2026')).toBeInTheDocument();

    // From July, two fast swipes to the left reach August, then September
    swipe(-150);
    swipe(-150);
    await wait(150);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
  });

  it('does not let a late swipe from the previous month pass the current month', async () => {
    renderWithProviders(<CalendarGrid />);
    swipe(150);
    await wait(150);
    // Two swipes to the left during one slide: the second one is checked before the first applies
    swipe(-150);
    swipe(-150);
    await wait(150);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
  });
});
