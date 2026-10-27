import { describe, it, expect } from 'vitest';
import { averagePhases, getCyclePhases } from '../cyclePhases';
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
      mensesDays: 2,
      follicularDays: 5,
      lutealDays: 3,
      peak: withPeak.observations[4],
    });
  });

  it('counts the follicular phase so far before the Peak Day', () => {
    expect(getCyclePhases(beforePeak)).toEqual({
      lengthDays: 4,
      mensesDays: 2,
      follicularDays: 4,
      lutealDays: 0,
      peak: undefined,
    });
  });

  it('returns zero days for an empty cycle', () => {
    expect(getCyclePhases({ id: 'c', startDate: '2026-09-01', observations: [] })).toEqual({
      lengthDays: 0,
      mensesDays: 0,
      follicularDays: 0,
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
      mensesDays: 4,
      follicularDays: 13,
      lutealDays: 15,
      cyclesWithPeak: 2,
    });
  });

  it('leaves out cycles without a Peak Day from the follicular and luteal averages', () => {
    expect(averagePhases([withPeak, beforePeak])).toEqual({
      lengthDays: 6,
      mensesDays: 2,
      follicularDays: 5,
      lutealDays: 3,
      cyclesWithPeak: 1,
    });
  });

  it('uses the follicular phase so far when no cycle has a Peak Day', () => {
    expect(averagePhases([beforePeak])).toEqual({
      lengthDays: 4,
      mensesDays: 2,
      follicularDays: 4,
      lutealDays: 0,
      cyclesWithPeak: 0,
    });
  });

  it('returns zero days without cycles', () => {
    expect(averagePhases([])).toEqual({
      lengthDays: 0,
      mensesDays: 0,
      follicularDays: 0,
      lutealDays: 0,
      cyclesWithPeak: 0,
    });
  });
});
