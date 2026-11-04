import { describe, expect, it } from 'vitest';
import { dayKey, sameDay, toSyncDay } from '../canonical';

describe('toSyncDay', () => {
  it('keeps only the fields that sync, in their canonical form', () => {
    expect(
      toSyncDay({
        id: 'obs_1',
        date: '2026-10-01',
        cycleDay: 4,
        stamp: 'WHITE_BABY',
        codeString: '10KL X1',
        isPeakDay: true,
        isManualPeak: true,
        bleeding: 'L',
        stretch: '10',
        modifiers: ['L', 'K', 'L'],
        frequency: 'X1',
        symptoms: ['RAP', 'AP'],
        intercourse: true,
        notes: 'note',
        isCycleStart: false,
      })
    ).toEqual({
      bleeding: 'L',
      stretch: '10',
      modifiers: ['K', 'L'],
      frequency: 'X1',
      symptoms: ['AP', 'RAP'],
      intercourse: true,
      notes: 'note',
      isCycleStart: false,
    });
  });

  it('removes the empty and false values, and keeps isCycleStart true', () => {
    expect(
      toSyncDay({ modifiers: [], symptoms: [], intercourse: false, notes: '', isCycleStart: true })
    ).toEqual({ isCycleStart: true });
    expect(toSyncDay({ date: '2026-10-01' })).toEqual({});
  });
});

describe('sameDay', () => {
  it('compares the canonical days, not the order of the fields', () => {
    expect(sameDay({ stretch: '0', bleeding: 'B' }, { bleeding: 'B', stretch: '0' })).toBe(true);
    expect(sameDay({ stretch: '0' }, { stretch: '2' })).toBe(false);
    expect(sameDay({ isCycleStart: false }, {})).toBe(false);
  });

  it('treats a deleted day and a missing day as the same', () => {
    expect(sameDay(null, null)).toBe(true);
    expect(sameDay(null, {})).toBe(false);
    expect(dayKey(null)).toBe('null');
  });
});
