import { describe, it, expect } from 'vitest';
import {
  groupObservationsIntoCycles,
  isFirstBleedingDayOfSeries,
  getCycleEndDate,
  getCycleDayOn,
} from '../cycleBoundaryDetector';
import type { Observation } from '../../types/crms';
import { makeObservation } from '../../test/factories';

describe('cycleBoundaryDetector', () => {
  it('groups single cycle observations properly', () => {
    const rawObs: Observation[] = [
      { id: '1', date: '2026-07-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      {
        id: '2',
        date: '2026-07-02',
        cycleDay: 2,
        stretch: '0',
        stamp: 'DARK_GREEN',
        codeString: '0',
      },
    ];

    const cycles = groupObservationsIntoCycles(rawObs);
    expect(cycles.length).toBe(1);
    expect(cycles[0]?.observations.length).toBe(2);
  });

  it('splits multiple cycles when a new menses phase begins', () => {
    const rawObs: Observation[] = [
      // Cycle 1
      { id: '1', date: '2026-06-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      {
        id: '2',
        date: '2026-06-02',
        cycleDay: 2,
        stretch: '0',
        stamp: 'DARK_GREEN',
        codeString: '0',
      },
      // Cycle 2 (Menses start on July 1)
      { id: '3', date: '2026-07-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      {
        id: '4',
        date: '2026-07-02',
        cycleDay: 2,
        stretch: '0',
        stamp: 'DARK_GREEN',
        codeString: '0',
      },
    ];

    const cycles = groupObservationsIntoCycles(rawObs);
    expect(cycles.length).toBe(2);
    expect(cycles[0]?.startDate).toBe('2026-07-01'); // Most recent cycle first
    expect(cycles[1]?.startDate).toBe('2026-06-01'); // Past cycle second
  });

  it('respects explicit isCycleStart = false (does not start new cycle on bleeding day)', () => {
    const rawObs: Observation[] = [
      { id: '1', date: '2026-06-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      {
        id: '2',
        date: '2026-06-15',
        cycleDay: 15,
        stretch: '0',
        stamp: 'DARK_GREEN',
        codeString: '0',
      },
      // Breakthrough bleeding on Day 16, marked explicitly as NOT a new cycle
      {
        id: '3',
        date: '2026-06-16',
        cycleDay: 16,
        bleeding: 'L',
        isCycleStart: false,
        stamp: 'RED',
        codeString: 'L',
      },
      {
        id: '4',
        date: '2026-06-17',
        cycleDay: 17,
        stretch: '0',
        stamp: 'DARK_GREEN',
        codeString: '0',
      },
    ];

    const cycles = groupObservationsIntoCycles(rawObs);
    expect(cycles.length).toBe(1);
    expect(cycles[0]?.observations.length).toBe(4);
  });

  it('respects explicit isCycleStart = true (forces new cycle start)', () => {
    const rawObs: Observation[] = [
      { id: '1', date: '2026-06-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      {
        id: '2',
        date: '2026-06-15',
        cycleDay: 15,
        stretch: '0',
        stamp: 'DARK_GREEN',
        codeString: '0',
      },
      // Spotting day explicitly marked as new cycle start
      {
        id: '3',
        date: '2026-06-16',
        cycleDay: 1,
        bleeding: 'VL',
        isCycleStart: true,
        stamp: 'RED',
        codeString: 'VL',
      },
    ];

    const cycles = groupObservationsIntoCycles(rawObs);
    expect(cycles.length).toBe(2);
    expect(cycles[0]?.startDate).toBe('2026-06-16');
    expect(cycles[1]?.startDate).toBe('2026-06-01');
  });

  it('correctly identifies first bleeding day of a series with isFirstBleedingDayOfSeries', () => {
    const existing: Observation[] = [
      { id: '1', date: '2026-06-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      { id: '2', date: '2026-06-02', cycleDay: 2, bleeding: 'M', stamp: 'RED', codeString: 'M' },
      {
        id: '3',
        date: '2026-06-03',
        cycleDay: 3,
        stretch: '0',
        stamp: 'DARK_GREEN',
        codeString: '0',
      },
    ];

    // Logging bleeding on June 4 (preceded by dry day June 3) -> TRUE
    expect(isFirstBleedingDayOfSeries({ date: '2026-06-04', bleeding: 'L' }, existing)).toBe(true);

    // Logging bleeding on June 2 (preceded by bleeding day June 1) -> FALSE
    expect(isFirstBleedingDayOfSeries({ date: '2026-06-02', bleeding: 'L' }, existing)).toBe(false);

    // Logging dry day on June 4 -> FALSE
    expect(isFirstBleedingDayOfSeries({ date: '2026-06-04' }, existing)).toBe(false);
  });

  it('returns no cycles for no observations', () => {
    expect(groupObservationsIntoCycles([])).toEqual([]);
  });

  it('starts a new cycle when menses follow a brown bleeding day', () => {
    const cycles = groupObservationsIntoCycles([
      makeObservation({ date: '2026-07-01', bleeding: 'H' }),
      makeObservation({ date: '2026-07-02', stretch: '0' }),
      makeObservation({ date: '2026-07-28', bleeding: 'B' }),
      makeObservation({ date: '2026-07-29', bleeding: 'M' }),
    ]);
    expect(cycles.map(c => c.startDate)).toEqual(['2026-07-29', '2026-07-01']);
  });

  it('continues the cycle when menses follow another menses day', () => {
    const cycles = groupObservationsIntoCycles([
      makeObservation({ date: '2026-07-01', bleeding: 'H' }),
      makeObservation({ date: '2026-07-02', bleeding: 'M' }),
    ]);
    expect(cycles).toHaveLength(1);
  });
});

describe('getCycleEndDate', () => {
  it('returns the date of the last observation', () => {
    const [cycle] = groupObservationsIntoCycles([
      makeObservation({ date: '2026-09-01', bleeding: 'H' }),
      makeObservation({ date: '2026-09-03', stretch: '0' }),
    ]);
    expect(cycle && getCycleEndDate(cycle)).toBe('2026-09-03');
  });

  it('returns the start date of an empty cycle', () => {
    expect(getCycleEndDate({ id: 'c', startDate: '2026-09-01', observations: [] })).toBe(
      '2026-09-01'
    );
  });
});

describe('getCycleDayOn', () => {
  const cycles = [
    { id: 'c2', startDate: '2026-09-29', observations: [] },
    { id: 'c1', startDate: '2026-09-01', observations: [] },
  ];

  it('counts the days from the start of the last cycle that starts on or before the date', () => {
    expect(getCycleDayOn(cycles, '2026-09-01')).toBe(1);
    expect(getCycleDayOn(cycles, '2026-09-28')).toBe(28);
    expect(getCycleDayOn(cycles, '2026-10-03')).toBe(5);
  });

  it('gives no cycle day before the first cycle or with no cycle', () => {
    expect(getCycleDayOn(cycles, '2026-08-31')).toBeUndefined();
    expect(getCycleDayOn([], '2026-09-01')).toBeUndefined();
  });
});
