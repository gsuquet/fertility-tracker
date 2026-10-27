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
    // A fertile day after the manual peak keeps its white stamp
    expect(result[2]?.stamp).toBe('WHITE_BABY');
    expect(result[3]?.stamp).toBe('LIGHT_GREEN_BABY_1');
  });

  it('has no Peak Day when the manual date is not in the cycle', () => {
    const result = processCycleObservations(cycle, '2026-08-01');
    expect(result.some(o => o.isPeakDay)).toBe(false);
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

  describe('light green days after fertile mucus', () => {
    const stamps = (observations: Parameters<typeof processCycleObservations>[0]) =>
      processCycleObservations(observations).map(o => o.stamp);

    it('gives three light green days after a mucus patch before the Peak Day', () => {
      expect(
        stamps([
          makeObservation({ date: '2026-07-01', bleeding: 'H' }),
          makeObservation({ date: '2026-07-02', stretch: '10', modifiers: ['K'] }),
          makeObservation({ date: '2026-07-03', stretch: '0' }),
          makeObservation({ date: '2026-07-04', stretch: '0' }),
          makeObservation({ date: '2026-07-05', stretch: '0' }),
          makeObservation({ date: '2026-07-06', stretch: '0' }),
          makeObservation({ date: '2026-07-07', stretch: '10', modifiers: ['L'] }),
          makeObservation({ date: '2026-07-08', stretch: '0' }),
        ])
      ).toEqual([
        'RED',
        'WHITE_BABY',
        'LIGHT_GREEN_BABY_1',
        'LIGHT_GREEN_BABY_2',
        'LIGHT_GREEN_BABY_3',
        'DARK_GREEN',
        'WHITE_BABY',
        'LIGHT_GREEN_BABY_1',
      ]);
    });

    it('restarts the count when mucus comes back during the count', () => {
      expect(
        stamps([
          makeObservation({ date: '2026-07-01', stretch: '10', modifiers: ['K'] }),
          makeObservation({ date: '2026-07-02', stretch: '0' }),
          makeObservation({ date: '2026-07-03', stretch: '10', modifiers: ['K'] }),
          makeObservation({ date: '2026-07-04', stretch: '0' }),
          makeObservation({ date: '2026-07-05', stretch: '0' }),
        ])
      ).toEqual([
        'WHITE_BABY',
        'LIGHT_GREEN_BABY_1',
        'WHITE_BABY',
        'LIGHT_GREEN_BABY_1',
        'LIGHT_GREEN_BABY_2',
      ]);
    });

    it('keeps a red stamp during the count', () => {
      expect(
        stamps([
          makeObservation({ date: '2026-07-01', stretch: '10', modifiers: ['K'] }),
          makeObservation({ date: '2026-07-02', bleeding: 'B' }),
          makeObservation({ date: '2026-07-03', stretch: '0' }),
        ])
      ).toEqual(['WHITE_BABY', 'RED', 'LIGHT_GREEN_BABY_2']);
    });

    it('counts calendar days when a day is not logged', () => {
      expect(
        stamps([
          makeObservation({ date: '2026-07-01', stretch: '10', modifiers: ['K'] }),
          makeObservation({ date: '2026-07-03', stretch: '0' }),
          makeObservation({ date: '2026-07-05', stretch: '0' }),
        ])
      ).toEqual(['WHITE_BABY', 'LIGHT_GREEN_BABY_2', 'DARK_GREEN']);
    });

    it('starts the count after a manual Peak Day on a dry day', () => {
      expect(
        processCycleObservations([
          makeObservation({ date: '2026-07-01', stretch: '0', isManualPeak: true }),
          makeObservation({ date: '2026-07-02', stretch: '0' }),
        ]).map(o => o.stamp)
      ).toEqual(['DARK_GREEN', 'LIGHT_GREEN_BABY_1']);
    });
  });
});
