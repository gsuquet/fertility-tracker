import type { Cycle, Observation } from '../types/crms';

/** The phase lengths of one cycle, in calendar days. */
export interface CyclePhases {
  /** Days from the first to the last observation, both included. */
  lengthDays: number;
  /** Days with a red stamp. */
  mensesDays: number;
  /** Days up to and including the Peak Day, or all days so far before the Peak Day. */
  follicularDays: number;
  /** Days after the Peak Day, or 0 before the Peak Day. */
  lutealDays: number;
  peak: Observation | undefined;
}

export function getCyclePhases(cycle: Cycle): CyclePhases {
  const lengthDays = cycle.observations.at(-1)?.cycleDay ?? 0;
  const peak = cycle.observations.find(o => o.isPeakDay);
  return {
    lengthDays,
    mensesDays: cycle.observations.filter(o => o.stamp === 'RED').length,
    follicularDays: peak ? peak.cycleDay : lengthDays,
    lutealDays: peak ? lengthDays - peak.cycleDay : 0,
    peak,
  };
}

export interface AveragePhases {
  lengthDays: number;
  mensesDays: number;
  follicularDays: number;
  lutealDays: number;
  /** The number of cycles in the follicular and luteal averages, when any cycle has a Peak Day. */
  cyclesWithPeak: number;
}

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * Averages the phases per cycle. A cycle without a Peak Day has no luteal phase yet, so
 * the follicular and luteal averages use only the cycles with a Peak Day when there are any.
 */
export function averagePhases(cycles: Cycle[]): AveragePhases {
  const phases = cycles.map(getCyclePhases);
  const withPeak = phases.filter(p => p.peak);
  const splitBasis = withPeak.length > 0 ? withPeak : phases;
  return {
    lengthDays: average(phases.map(p => p.lengthDays)),
    mensesDays: average(phases.map(p => p.mensesDays)),
    follicularDays: average(splitBasis.map(p => p.follicularDays)),
    lutealDays: average(splitBasis.map(p => p.lutealDays)),
    cyclesWithPeak: withPeak.length,
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

/** The days of a cycle in each of the four phases of Analytics and of the chart phase bar */
export interface PhaseSegments {
  mensesDays: number;
  /** The days before the Peak Day, after the menses, and the Peak Day */
  beforePeakDays: number;
  /** The days of the Post-Peak count: 3 or less */
  countDays: number;
  /** The days after the count */
  afterCountDays: number;
}

/** Counts the observations of a cycle in each phase */
export function getPhaseSegments(cycle: Cycle): PhaseSegments {
  const peakDay = cycle.observations.find(o => o.isPeakDay)?.cycleDay;
  const phases = cycle.observations.map(o => dayPhase(o, peakDay));
  const count = (...names: DayPhase[]) => phases.filter(p => names.includes(p)).length;
  return {
    mensesDays: count('menses'),
    beforePeakDays: count('follicular', 'peak'),
    countDays: count('post-peak'),
    afterCountDays: count('luteal'),
  };
}

/** The average of the phase segments of the cycles */
export function averageSegments(cycles: Cycle[]): PhaseSegments {
  const segments = cycles.map(getPhaseSegments);
  return {
    mensesDays: average(segments.map(s => s.mensesDays)),
    beforePeakDays: average(segments.map(s => s.beforePeakDays)),
    countDays: average(segments.map(s => s.countDays)),
    afterCountDays: average(segments.map(s => s.afterCountDays)),
  };
}
