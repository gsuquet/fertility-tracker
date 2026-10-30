import type { Cycle, Observation } from '../types/crms';

/** The phase lengths of one cycle, in calendar days. */
export interface CyclePhases {
  /** Days from the first to the last observation, both included. */
  lengthDays: number;
  /** Days after the Peak Day, or 0 before the Peak Day. */
  lutealDays: number;
  peak: Observation | undefined;
}

export function getCyclePhases(cycle: Cycle): CyclePhases {
  const lengthDays = cycle.observations.at(-1)?.cycleDay ?? 0;
  const peak = cycle.observations.find(o => o.isPeakDay);
  return {
    lengthDays,
    lutealDays: peak ? lengthDays - peak.cycleDay : 0,
    peak,
  };
}

export interface AveragePhases {
  lengthDays: number;
  lutealDays: number;
  /** The number of cycles in the luteal average, when any cycle has a Peak Day. */
  cyclesWithPeak: number;
}

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

/** The cycles with a Peak Day, or all cycles when no cycle has a Peak Day */
const splitBasis = (cycles: Cycle[]) => {
  const withPeak = cycles.filter(c => c.observations.some(o => o.isPeakDay));
  return withPeak.length > 0 ? withPeak : cycles;
};

/**
 * Averages the phases per cycle. A cycle without a Peak Day has no luteal phase yet, so
 * the luteal average uses only the cycles with a Peak Day when there are any.
 */
export function averagePhases(cycles: Cycle[]): AveragePhases {
  const phases = cycles.map(getCyclePhases);
  return {
    lengthDays: average(phases.map(p => p.lengthDays)),
    lutealDays: average(splitBasis(cycles).map(c => getCyclePhases(c).lutealDays)),
    cyclesWithPeak: phases.filter(p => p.peak).length,
  };
}

/** The phase of a day with an observation. The Peak Day ends the time before the Peak Day. */
export type DayPhase = 'menses' | 'follicular' | 'peak' | 'post-peak' | 'luteal';

/**
 * The phase of a day: menses, then the days up to the Peak Day, then the 3 days of the count, then
 * the days after the count. A cycle with no Peak Day has no count.
 */
export function dayPhase(obs: Observation, peakDay: number | undefined): DayPhase {
  if (obs.cycleDay === peakDay) return 'peak';
  const afterPeak = peakDay !== undefined && obs.cycleDay > peakDay;
  if (!afterPeak) return obs.stamp === 'RED' || obs.bleeding ? 'menses' : 'follicular';
  return obs.cycleDay - (peakDay as number) <= 3 ? 'post-peak' : 'luteal';
}

/**
 * The calendar days of a cycle in each of the four phases of Analytics. The four values add up to
 * the cycle length, and the count and the days after it add up to the luteal phase.
 */
export interface PhaseSegments {
  /** The menses days before the Peak Day */
  mensesDays: number;
  /** The other days up to and including the Peak Day, or up to the last day without a Peak Day */
  beforePeakDays: number;
  /** The days of the Post-Peak count: 3 or less */
  countDays: number;
  /** The days after the count */
  afterCountDays: number;
}

/** Splits the calendar days of a cycle into the four phases. A missing day before the Peak Day is in the time before it. */
export function getPhaseSegments(cycle: Cycle): PhaseSegments {
  const { lengthDays, lutealDays, peak } = getCyclePhases(cycle);
  const peakDay = peak?.cycleDay;
  const mensesDays = cycle.observations.filter(o => dayPhase(o, peakDay) === 'menses').length;
  const countDays = Math.min(3, lutealDays);
  return {
    mensesDays,
    beforePeakDays: (peakDay ?? lengthDays) - mensesDays,
    countDays,
    afterCountDays: lutealDays - countDays,
  };
}

/**
 * The average of the phase segments. The menses average uses all cycles. The other averages use
 * the cycles with a Peak Day when there are any, as the luteal average of averagePhases does.
 */
export function averageSegments(cycles: Cycle[]): PhaseSegments {
  const split = splitBasis(cycles).map(getPhaseSegments);
  return {
    mensesDays: average(cycles.map(c => getPhaseSegments(c).mensesDays)),
    beforePeakDays: average(split.map(s => s.beforePeakDays)),
    countDays: average(split.map(s => s.countDays)),
    afterCountDays: average(split.map(s => s.afterCountDays)),
  };
}
