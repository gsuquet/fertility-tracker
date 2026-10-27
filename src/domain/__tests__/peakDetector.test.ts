import { describe, it, expect } from 'vitest';
import { processCycleObservations } from '../peakDetector';
import { makeObservation } from '../../test/factories';

const cycle = [
  makeObservation({ date: '2026-07-01', bleeding: 'H' }),
  makeObservation({ date: '2026-07-02', stretch: '10', modifiers: ['K'] }),
  makeObservation({ date: '2026-07-03', stretch: '8', modifiers: ['C'] }),
  makeObservation({ date: '2026-07-04', stretch: '0' }),
  makeObservation({ date: '2026-07-05', stretch: '0' }),
  makeObservation({ date: '2026-07-06', stretch: '0' }),
  makeObservation({ date: '2026-07-07', stretch: '0' }),
];

describe('processCycleObservations', () => {
  it('returns an empty list for no observations', () => {
    expect(processCycleObservations([])).toEqual([]);
  });

  it('uses the last peak-type mucus day as the automatic Peak Day', () => {
    const result = processCycleObservations(cycle);
    expect(result.map(o => o.isPeakDay)).toEqual([false, false, true, false, false, false, false]);
    expect(result.map(o => o.stamp)).toEqual([
      'RED',
      'WHITE_BABY',
      'WHITE_BABY',
      'LIGHT_GREEN_BABY_1',
      'LIGHT_GREEN_BABY_2',
      'LIGHT_GREEN_BABY_3',
      'DARK_GREEN',
    ]);
  });

  it('uses the manual Peak Day date when it is given', () => {
    const result = processCycleObservations(cycle, '2026-07-02');
    expect(result.find(o => o.isPeakDay)?.date).toBe('2026-07-02');
    expect(result[2]?.stamp).toBe('LIGHT_GREEN_BABY_1');
  });

  it('has no Peak Day when the manual date is not in the cycle', () => {
    const result = processCycleObservations(cycle, '2026-08-01');
    expect(result.some(o => o.isPeakDay)).toBe(false);
    expect(result[3]?.stamp).toBe('DARK_GREEN');
  });

  it('uses an observation flagged isManualPeak before the automatic Peak Day', () => {
    const flagged = cycle.map(o => (o.date === '2026-07-02' ? { ...o, isManualPeak: true } : o));
    const result = processCycleObservations(flagged);
    expect(result.find(o => o.isPeakDay)?.date).toBe('2026-07-02');
  });

  it('has no Peak Day and no post-peak stamps when there is no peak-type mucus', () => {
    const dry = [makeObservation({ date: '2026-07-01', stretch: '0' })];
    const result = processCycleObservations(dry);
    expect(result[0]).toMatchObject({ isPeakDay: false, stamp: 'DARK_GREEN', cycleDay: 1 });
  });
});
