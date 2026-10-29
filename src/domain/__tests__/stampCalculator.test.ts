import { describe, it, expect } from 'vitest';
import {
  calculateStamp,
  hasObservationCode,
  isPeakTypeMucus,
  showsEmptyStamp,
} from '../stampCalculator';
import { makeObservation } from '../../test/factories';

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

describe('hasObservationCode', () => {
  it('is false with no bleeding, mucus or frequency code, also with I, symptoms or notes', () => {
    expect(hasObservationCode({})).toBe(false);
    expect(hasObservationCode({ modifiers: [] })).toBe(false);
  });

  it.each([
    [{ bleeding: 'H' }],
    [{ stretch: '0' }],
    [{ modifiers: ['K'] }],
    [{ frequency: 'AD' }],
  ] as const)('is true for %o', fields => {
    expect(hasObservationCode(fields)).toBe(true);
  });
});

describe('showsEmptyStamp', () => {
  it('is true for a saved day with no code and the dry fallback stamp', () => {
    expect(showsEmptyStamp(makeObservation({ date: '2026-09-15', intercourse: true }))).toBe(true);
  });

  it('keeps a day of the count of three with no code, so its fertile mark stays', () => {
    const countDay = makeObservation({ date: '2026-09-15', stamp: 'LIGHT_GREEN_BABY_1' });
    expect(showsEmptyStamp(countDay)).toBe(false);
  });

  it('is false for a day with a code', () => {
    expect(showsEmptyStamp(makeObservation({ date: '2026-09-15', stretch: '0' }))).toBe(false);
  });
});
