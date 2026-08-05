import { Observation, Cycle } from '../types/crms';
import { processCycleObservations } from './peakDetector';

/**
 * Helper to check if an observation (or planned observation) on a specific date
 * is the first bleeding day of a series (i.e., has a bleeding code and is preceded by a non-bleeding day or no observation).
 */
export function isFirstBleedingDayOfSeries(
  obsData: { date: string; bleeding?: string },
  allObservations: Observation[]
): boolean {
  if (!obsData.bleeding || !['H', 'M', 'L', 'VL', 'B'].includes(obsData.bleeding)) {
    return false;
  }

  // Filter out the current observation date if updating existing
  const otherObs = allObservations.filter(o => o.date !== obsData.date);

  // Find the closest observation before obsData.date
  const priorObs = otherObs
    .filter(o => o.date < obsData.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  // If there is no prior observation, or if prior observation had no bleeding
  if (!priorObs || !priorObs.bleeding) {
    return true;
  }

  return false;
}

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
    // 1. Explicitly marked as manual cycle start (isCycleStart === true) -> true
    // 2. Explicitly marked as NOT cycle start (isCycleStart === false) -> false
    // 3. Otherwise default: Menses bleeding (H, M, L, VL) following non-bleeding or dry days
    let isNewCycle = false;
    if (obs.isCycleStart !== undefined) {
      isNewCycle = i > 0 && obs.isCycleStart === true;
    } else {
      const isMensesStart = Boolean(obs.bleeding && ['H', 'M', 'L', 'VL'].includes(obs.bleeding));
      isNewCycle = i > 0 && isMensesStart && (!prevObs?.bleeding || prevObs.bleeding === 'B');
    }

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
