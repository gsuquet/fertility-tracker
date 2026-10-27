import type { Observation, StampType } from '../types/crms';
import { isPeakTypeMucus, calculateStamp } from './stampCalculator';
import { getDaysDifference } from '../utils/dateUtils';

/**
 * Calculates Peak Day ('P') and applies post-peak stamps (Light Green 1, 2, 3) after each run of
 * fertile mucus and after the Peak Day.
 * Ensures observations are sorted chronologically by date and cycleDay is accurately calculated from start date.
 */
export function processCycleObservations(
  observations: Observation[],
  manualPeakDate?: string
): Observation[] {
  // Sort observations chronologically by date
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const [first] = sorted;
  if (!first) return [];
  const startDate = first.date;

  // Find Peak Day
  let peakIndex = -1;

  if (manualPeakDate) {
    peakIndex = sorted.findIndex(obs => obs.date === manualPeakDate);
  } else {
    // Find manual flag inside observations or automatically calculate last Peak-type day
    const manualObsIndex = sorted.findIndex(obs => obs.isManualPeak);
    if (manualObsIndex !== -1) {
      peakIndex = manualObsIndex;
    } else {
      // Find last day with peak-type mucus
      peakIndex = sorted.findLastIndex(obs => isPeakTypeMucus(obs.stretch, obs.modifiers || []));
    }
  }

  // The three days after the last fertile day (white stamp or Peak Day) count as
  // post-peak days. Only a day that is otherwise green gets the light green stamp.
  const POST_PEAK_STAMPS = [
    'LIGHT_GREEN_BABY_1',
    'LIGHT_GREEN_BABY_2',
    'LIGHT_GREEN_BABY_3',
  ] as const;
  let lastFertileDate: string | undefined;

  return sorted.map((obs, idx) => {
    const isPeakDay = idx === peakIndex;
    let stamp: StampType = calculateStamp(obs.bleeding, obs.stretch, obs.modifiers || []);

    if (stamp === 'WHITE_BABY' || isPeakDay) {
      lastFertileDate = obs.date;
    } else if (stamp === 'DARK_GREEN' && lastFertileDate) {
      stamp = POST_PEAK_STAMPS[getDaysDifference(lastFertileDate, obs.date) - 1] ?? stamp;
    }

    return {
      ...obs,
      cycleDay: getDaysDifference(startDate, obs.date) + 1,
      stamp,
      isPeakDay,
    };
  });
}
