import { describe, it, expect } from 'vitest';
import { calculateStamp, isPeakTypeMucus } from '../stampCalculator';

describe('isPeakTypeMucus', () => {
  it('returns false when there is no stretch and no modifier', () => {
    expect(isPeakTypeMucus()).toBe(false);
  });

  it.each(['6', '8', '10', '10DL', '10SL', '10WL'] as const)('returns true for stretch %s', s => {
    expect(isPeakTypeMucus(s)).toBe(true);
  });

  it.each(['0', '2', '2W', '4'] as const)('returns false for stretch %s without K or L', s => {
    expect(isPeakTypeMucus(s, ['C', 'P', 'Y'])).toBe(false);
  });
});

describe('calculateStamp', () => {
  it('returns RED for brown bleeding with no mucus', () => {
    expect(calculateStamp('B')).toBe('RED');
  });

  it('returns RED for brown bleeding with a dry 0 observation', () => {
    expect(calculateStamp('B', '0')).toBe('RED');
  });

  it('returns DARK_GREEN for brown bleeding with non-peak mucus', () => {
    expect(calculateStamp('B', '4', ['C'])).toBe('DARK_GREEN');
  });

  it('returns WHITE_BABY when peak-type mucus occurs during bleeding', () => {
    expect(calculateStamp('L', '10', ['K'])).toBe('WHITE_BABY');
  });

  it('returns DARK_GREEN when there is no observation', () => {
    expect(calculateStamp()).toBe('DARK_GREEN');
  });
});
