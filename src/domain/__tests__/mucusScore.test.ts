import { describe, it, expect } from 'vitest';
import { getMucusScore } from '../mucusScore';

describe('getMucusScore', () => {
  it('returns 0 when there is no stretch and no modifier', () => {
    expect(getMucusScore({})).toBe(0);
  });

  it.each([
    ['0', 0],
    ['2', 2],
    ['2W', 2],
    ['4', 4],
    ['6', 6],
    ['8', 8],
    ['10', 10],
    ['10DL', 10],
    ['10SL', 10],
    ['10WL', 10],
  ] as const)('returns the score of stretch %s', (stretch, expected) => {
    expect(getMucusScore({ stretch })).toBe(expected);
  });

  it.each(['K', 'L'] as const)('returns 10 for modifier %s with a low stretch', modifier => {
    expect(getMucusScore({ stretch: '2', modifiers: [modifier] })).toBe(10);
  });

  it('returns 10 for modifier K without a stretch', () => {
    expect(getMucusScore({ modifiers: ['K'] })).toBe(10);
  });

  it('does not give modifier C/K the score 10', () => {
    expect(getMucusScore({ stretch: '4', modifiers: ['C/K'] })).toBe(4);
    expect(getMucusScore({ modifiers: ['C/K'] })).toBe(0);
  });
});
