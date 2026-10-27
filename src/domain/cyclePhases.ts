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
