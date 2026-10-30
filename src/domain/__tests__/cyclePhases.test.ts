import { describe, it, expect } from 'vitest';
import {
  averagePhases,
  averageSegments,
  dayPhase,
  getCyclePhases,
  getPhaseSegments,
} from '../cyclePhases';
import { groupObservationsIntoCycles } from '../cycleBoundaryDetector';
import { buildDemoObservations } from '../demoData';
import { makeObservation } from '../../test/factories';
import type { Cycle } from '../../types/crms';

const cycleOf = (observations: Parameters<typeof groupObservationsIntoCycles>[0]): Cycle => {
  const [cycle] = groupObservationsIntoCycles(observations);
  if (!cycle) throw new Error('expected one cycle');
  return cycle;
};

// Menses on days 1-2, dry days 3-4, fertile mucus on day 5 (Peak Day), dry days 6-8
const withPeak = cycleOf([
  makeObservation({ date: '2026-09-01', bleeding: 'H' }),
  makeObservation({ date: '2026-09-02', bleeding: 'M' }),
  makeObservation({ date: '2026-09-03', stretch: '0' }),
  makeObservation({ date: '2026-09-04', stretch: '0' }),
  makeObservation({ date: '2026-09-05', stretch: '10', modifiers: ['K'] }),
  makeObservation({ date: '2026-09-06', stretch: '0' }),
  makeObservation({ date: '2026-09-08', stretch: '0' }),
]);

// The same cycle before fertile mucus starts
const beforePeak = cycleOf([
  makeObservation({ date: '2026-09-01', bleeding: 'H' }),
  makeObservation({ date: '2026-09-02', bleeding: 'M' }),
  makeObservation({ date: '2026-09-03', stretch: '0' }),
  makeObservation({ date: '2026-09-04', stretch: '0' }),
]);

describe('getCyclePhases', () => {
  it('splits a cycle at the Peak Day', () => {
    expect(getCyclePhases(withPeak)).toEqual({
      lengthDays: 8,
      lutealDays: 3,
      peak: withPeak.observations[4],
    });
  });

  it('counts the follicular phase so far before the Peak Day', () => {
    expect(getCyclePhases(beforePeak)).toEqual({
      lengthDays: 4,
      lutealDays: 0,
      peak: undefined,
    });
  });

  it('returns zero days for an empty cycle', () => {
    expect(getCyclePhases({ id: 'c', startDate: '2026-09-01', observations: [] })).toEqual({
      lengthDays: 0,
      lutealDays: 0,
      peak: undefined,
    });
  });
});

describe('averagePhases', () => {
  it('averages each phase per cycle, not the sum of all cycles', () => {
    const cycles = groupObservationsIntoCycles(buildDemoObservations('2026-09-30'));
    expect(averagePhases(cycles)).toEqual({
      lengthDays: 28,
      lutealDays: 15,
      cyclesWithPeak: 2,
    });
  });

  it('leaves out cycles without a Peak Day from the luteal average', () => {
    expect(averagePhases([withPeak, beforePeak])).toEqual({
      lengthDays: 6,
      lutealDays: 3,
      cyclesWithPeak: 1,
    });
  });

  it('gives no luteal phase when no cycle has a Peak Day', () => {
    expect(averagePhases([beforePeak])).toEqual({
      lengthDays: 4,
      lutealDays: 0,
      cyclesWithPeak: 0,
    });
  });

  it('returns zero days without cycles', () => {
    expect(averagePhases([])).toEqual({
      lengthDays: 0,
      lutealDays: 0,
      cyclesWithPeak: 0,
    });
  });
});

describe('dayPhase', () => {
  const day = (cycleDay: number, extra = {}) =>
    makeObservation({ date: '2026-09-01', cycleDay, ...extra });

  it('gives menses, the time before the Peak Day, the Peak Day, the count and after the count', () => {
    expect(dayPhase(day(1, { stamp: 'RED' }), 10)).toBe('menses');
    expect(dayPhase(day(2, { bleeding: 'VL', stamp: 'DARK_GREEN' }), 10)).toBe('menses');
    expect(dayPhase(day(5), 10)).toBe('follicular');
    expect(dayPhase(day(10), 10)).toBe('peak');
    expect(dayPhase(day(13), 10)).toBe('post-peak');
    expect(dayPhase(day(14, { stamp: 'RED' }), 10)).toBe('luteal');
  });

  it('has no count without a Peak Day', () => {
    expect(dayPhase(day(20), undefined)).toBe('follicular');
  });
});

describe('getPhaseSegments and averageSegments', () => {
  it('splits the calendar days, so a missing day after the Peak Day is in the count', () => {
    // Day 7 is missing: the count is still days 6 to 8, as the luteal phase is 3 days
    expect(getPhaseSegments(withPeak)).toEqual({
      mensesDays: 2,
      beforePeakDays: 3,
      countDays: 3,
      afterCountDays: 0,
    });
    expect(getPhaseSegments(beforePeak)).toEqual({
      mensesDays: 2,
      beforePeakDays: 2,
      countDays: 0,
      afterCountDays: 0,
    });
  });

  it('gives segments that add up to the length, and a count and after-count equal to the luteal phase', () => {
    for (const cycle of [withPeak, beforePeak]) {
      const s = getPhaseSegments(cycle);
      const phases = getCyclePhases(cycle);
      expect(s.mensesDays + s.beforePeakDays + s.countDays + s.afterCountDays).toBe(
        phases.lengthDays
      );
      expect(s.countDays + s.afterCountDays).toBe(phases.lutealDays);
    }
  });

  it('puts a missing day before the Peak Day in the time before the Peak Day', () => {
    const gap = cycleOf([
      makeObservation({ date: '2026-09-01', bleeding: 'H' }),
      makeObservation({ date: '2026-09-04', stretch: '10', modifiers: ['K'] }),
      makeObservation({ date: '2026-09-05', stretch: '0' }),
    ]);
    expect(getPhaseSegments(gap)).toEqual({
      mensesDays: 1,
      beforePeakDays: 3,
      countDays: 1,
      afterCountDays: 0,
    });
  });

  it('gives the four phases of the demo cycle', () => {
    const [demo] = groupObservationsIntoCycles(buildDemoObservations('2026-09-30'));
    expect(getPhaseSegments(demo as Cycle)).toEqual({
      mensesDays: 4,
      beforePeakDays: 9,
      countDays: 3,
      afterCountDays: 12,
    });
  });

  it('averages the menses of all cycles and the other phases of the cycles with a Peak Day', () => {
    const shortMenses = cycleOf([
      makeObservation({ date: '2026-10-01', bleeding: 'H' }),
      makeObservation({ date: '2026-10-02', stretch: '0' }),
    ]);
    const segments = averageSegments([withPeak, shortMenses]);
    expect(segments).toEqual({
      mensesDays: 1.5,
      beforePeakDays: 3,
      countDays: 3,
      afterCountDays: 0,
    });
    // The bar agrees with the luteal tile of the same cycles
    expect(segments.countDays + segments.afterCountDays).toBe(
      averagePhases([withPeak, shortMenses]).lutealDays
    );
  });

  it('averages all cycles when no cycle has a Peak Day, and gives 0 without cycles', () => {
    expect(averageSegments([beforePeak])).toEqual(getPhaseSegments(beforePeak));
    expect(averageSegments([])).toEqual({
      mensesDays: 0,
      beforePeakDays: 0,
      countDays: 0,
      afterCountDays: 0,
    });
  });
});
