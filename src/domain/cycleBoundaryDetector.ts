import { Observation, Cycle } from '../types/crms';
import { processCycleObservations } from './peakDetector';

/**
 * Group a chronological list of observations into distinct menstrual cycles.
 * A new cycle begins whenever a menses phase (Bleeding H, M, L, VL) starts after an infertile/luteal phase,
 * or when an observation is explicitly marked as a cycle start.
 */
export function groupObservationsIntoCycles(observations: Observation[]): Cycle[] {
  if (observations.length === 0) return [];

  // Sort chronological (oldest to newest)
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));

  const cycles: Cycle[] = [];
  let currentCycleObs: Observation[] = [];
  let currentCycleStartDate = sorted[0].date;

  for (let i = 0; i < sorted.length; i++) {
    const obs = sorted[i];
    const prevObs = i > 0 ? sorted[i - 1] : null;

    // Detect if this observation starts a NEW cycle:
    // 1. Explicitly marked as manual cycle start
    // 2. Menses bleeding (H, M, L, VL) following non-bleeding or dry days
    const isMensesStart = obs.bleeding && ['H', 'M', 'L', 'VL'].includes(obs.bleeding);
    const isNewCycle = i > 0 && isMensesStart && (!prevObs?.bleeding || prevObs.bleeding === 'B');

    if (isNewCycle && currentCycleObs.length > 0) {
      // Process and save previous cycle
      const processedPrev = processCycleObservations(currentCycleObs);
      cycles.push({
        id: `cycle_${currentCycleStartDate}`,
        startDate: currentCycleStartDate,
        observations: processedPrev,
      });

      // Start new cycle
      currentCycleObs = [obs];
      currentCycleStartDate = obs.date;
    } else {
      currentCycleObs.push(obs);
    }
  }

  // Save final current cycle
  if (currentCycleObs.length > 0) {
    const processedCurrent = processCycleObservations(currentCycleObs);
    cycles.push({
      id: `cycle_${currentCycleStartDate}`,
      startDate: currentCycleStartDate,
      observations: processedCurrent,
    });
  }

  // Return cycles ordered newest to oldest (most recent cycle first)
  return cycles.reverse();
}
