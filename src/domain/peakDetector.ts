import { Observation } from '../types/crms';
import { isPeakTypeMucus, calculateStamp } from './stampCalculator';

/**
 * Calculates Peak Day ('P') and applies post-peak stamps (Light Green 1, 2, 3) across cycle observations.
 */
export function processCycleObservations(
  observations: Observation[],
  manualPeakDate?: string
): Observation[] {
  if (observations.length === 0) return [];

  // Sort observations by cycle day
  const sorted = [...observations].sort((a, b) => a.cycleDay - b.cycleDay);

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

  // Update observations with stamps and Peak flags
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

    return {
      ...obs,
      stamp,
      isPeakDay,
    };
  });
}
