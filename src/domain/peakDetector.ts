import { Observation } from '../types/crms';
import { isPeakTypeMucus, calculateStamp } from './stampCalculator';
import { getDaysDifference } from '../utils/dateUtils';

/**
 * Calculates Peak Day ('P') and applies post-peak stamps (Light Green 1, 2, 3) across cycle observations.
 * Ensures observations are sorted chronologically by date and cycleDay is accurately calculated from start date.
 */
export function processCycleObservations(
  observations: Observation[],
  manualPeakDate?: string
): Observation[] {
  if (observations.length === 0) return [];

  // Sort observations chronologically by date
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sorted[0].date;

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
      for (let i = sorted.length - 1; i >= 0; i--) {
        const obs = sorted[i];
        if (isPeakTypeMucus(obs.stretch, obs.modifiers || [])) {
          peakIndex = i;
          break;
        }
      }
    }
  }

  // Update observations with stamps, Peak flags, and accurate cycleDay
  return sorted.map((obs, idx) => {
    const isPeakDay = idx === peakIndex;
    let stamp = calculateStamp(obs.bleeding, obs.stretch, obs.modifiers || []);

    // Check if it falls in post-peak count (1, 2, 3)
    if (peakIndex !== -1 && idx > peakIndex && idx <= peakIndex + 3) {
      const postPeakNum = idx - peakIndex;
      if (postPeakNum === 1) stamp = 'LIGHT_GREEN_BABY_1';
      else if (postPeakNum === 2) stamp = 'LIGHT_GREEN_BABY_2';
      else if (postPeakNum === 3) stamp = 'LIGHT_GREEN_BABY_3';
    }

    const calculatedCycleDay = getDaysDifference(startDate, obs.date) + 1;

    return {
      ...obs,
      cycleDay: calculatedCycleDay,
      stamp,
      isPeakDay,
    };
  });
}

