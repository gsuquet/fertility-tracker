import {
  MENSES_BLEEDING_CODES,
  PEAK_TYPE_MODIFIERS,
  PEAK_TYPE_STRETCH_CODES,
  isCodeIn,
} from '../types/crms';
import type {
  BleedingCode,
  FrequencyCode,
  MucusStretch,
  MucusModifier,
  Observation,
  StampType,
} from '../types/crms';

/**
 * Determines if a set of mucus characteristics has Peak-type fertile qualities:
 * - Stretch 6, 8, 10 (or 10DL, 10SL, 10WL)
 * - Clear (K) or Lubricative (L) or Cloudy/Clear (C/K)
 */
export function isPeakTypeMucus(stretch?: MucusStretch, modifiers: MucusModifier[] = []): boolean {
  if (!stretch && modifiers.length === 0) return false;

  const isStretchy = isCodeIn(PEAK_TYPE_STRETCH_CODES, stretch);
  const isClearOrLubricative = modifiers.some(m => isCodeIn(PEAK_TYPE_MODIFIERS, m));

  return isStretchy || isClearOrLubricative;
}

/**
 * Calculates the Creighton Stamp Type for a single day observation.
 */
export function calculateStamp(
  bleeding?: BleedingCode,
  stretch?: MucusStretch,
  modifiers: MucusModifier[] = []
): StampType {
  // 1. Fertile Mucus (White Stamp with Baby)
  if (isPeakTypeMucus(stretch, modifiers)) {
    return 'WHITE_BABY';
  }

  // 2. Bleeding (Red Stamp)
  if (isCodeIn(MENSES_BLEEDING_CODES, bleeding)) {
    return 'RED';
  }
  if (bleeding === 'B' && (!stretch || stretch === '0')) {
    return 'RED';
  }

  // 3. Dry / Non-fertile (Dark Green Stamp)
  return 'DARK_GREEN';
}

/**
 * True when a day has a bleeding, mucus or frequency code. The I mark, the symptoms and the notes
 * alone are not an observation, so such a day shows the empty stamp and no fertility text.
 */
export function hasObservationCode(day: {
  bleeding?: BleedingCode | undefined;
  stretch?: MucusStretch | undefined;
  modifiers?: readonly MucusModifier[] | undefined;
  frequency?: FrequencyCode | undefined;
}): boolean {
  return Boolean(day.bleeding || day.stretch || day.frequency || day.modifiers?.length);
}

/**
 * True when a saved day shows the empty stamp: no code, and the dry fallback stamp. A day of the
 * count of three keeps its stamp, so its fertile mark stays visible.
 */
export function showsEmptyStamp(obs: Observation): boolean {
  return !hasObservationCode(obs) && obs.stamp === 'DARK_GREEN';
}
