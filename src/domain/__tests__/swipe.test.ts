import { describe, expect, it } from 'vitest';
import { detectDaySwipe, swipeIntent } from '../swipe';

describe('swipeIntent', () => {
  it('waits for a move of 10 pixels before it knows the gesture', () => {
    expect(swipeIntent(6, 6)).toBeNull();
    expect(swipeIntent(0, 0)).toBeNull();
  });

  it('gives horizontal under 30 degrees from horizontal, else other', () => {
    expect(swipeIntent(20, 5)).toBe('horizontal');
    expect(swipeIntent(-20, -11)).toBe('horizontal');
    expect(swipeIntent(20, 12)).toBe('other');
    expect(swipeIntent(0, 15)).toBe('other');
  });
});

describe('detectDaySwipe', () => {
  it('opens the next day for a long swipe to the left, and the previous day to the right', () => {
    expect(detectDaySwipe({ dx: -61, dy: 0, duration: 1000 })).toBe('next');
    expect(detectDaySwipe({ dx: 61, dy: 20, duration: 1000 })).toBe('prev');
  });

  it('opens a day for a fast flick of at least 24 pixels', () => {
    expect(detectDaySwipe({ dx: -30, dy: 0, duration: 60 })).toBe('next');
    expect(detectDaySwipe({ dx: 24, dy: 0, duration: 0 })).toBe('prev');
  });

  it('does nothing for a short slow swipe, a fast tap or a steep swipe', () => {
    expect(detectDaySwipe({ dx: -60, dy: 0, duration: 1000 })).toBeNull();
    expect(detectDaySwipe({ dx: 23, dy: 0, duration: 10 })).toBeNull();
    expect(detectDaySwipe({ dx: -200, dy: 120, duration: 100 })).toBeNull();
    expect(detectDaySwipe({ dx: 0, dy: 0, duration: 0 })).toBeNull();
  });
});
