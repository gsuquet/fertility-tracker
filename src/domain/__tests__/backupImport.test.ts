import { describe, it, expect } from 'vitest';
import { mergeObservations, summarizeObservations } from '../backupImport';
import { makeObservation } from '../../test/factories';

describe('summarizeObservations', () => {
  it('gives the count and the first and last dates', () => {
    const list = [
      makeObservation({ date: '2026-06-03' }),
      makeObservation({ date: '2026-06-01' }),
      makeObservation({ date: '2026-06-09' }),
    ];
    expect(summarizeObservations(list)).toEqual({
      count: 3,
      firstDate: '2026-06-01',
      lastDate: '2026-06-09',
    });
  });

  it('gives no dates for an empty list', () => {
    expect(summarizeObservations([])).toEqual({ count: 0, firstDate: null, lastDate: null });
  });
});

describe('mergeObservations', () => {
  it('replaces the days with the same date and keeps the other days, in date order', () => {
    const existing = [
      makeObservation({ date: '2026-06-01', notes: 'old' }),
      makeObservation({ date: '2026-06-05', notes: 'kept' }),
    ];
    const imported = [
      makeObservation({ date: '2026-06-03', notes: 'new day' }),
      makeObservation({ date: '2026-06-01', notes: 'from file' }),
    ];
    const merged = mergeObservations(existing, imported);
    expect(merged.map(o => [o.date, o.notes])).toEqual([
      ['2026-06-01', 'from file'],
      ['2026-06-03', 'new day'],
      ['2026-06-05', 'kept'],
    ]);
    expect(existing[0]?.notes).toBe('old');
  });

  it('keeps the manual Peak Day of the file and clears the others in that cycle only', () => {
    const existing = [
      makeObservation({ date: '2026-06-01', bleeding: 'H' }),
      makeObservation({ date: '2026-06-12', stretch: '10', isManualPeak: true }),
      makeObservation({ date: '2026-06-29', bleeding: 'H' }),
      makeObservation({ date: '2026-07-10', stretch: '10', isManualPeak: true }),
    ];
    const imported = [makeObservation({ date: '2026-06-14', stretch: '10', isManualPeak: true })];
    const peaks = mergeObservations(existing, imported)
      .filter(o => o.isManualPeak)
      .map(o => o.date);
    expect(peaks).toEqual(['2026-06-14', '2026-07-10']);
  });
});
