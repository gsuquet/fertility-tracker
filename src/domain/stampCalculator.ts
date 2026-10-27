import {
  MENSES_BLEEDING_CODES,
  PEAK_TYPE_MODIFIERS,
  PEAK_TYPE_STRETCH_CODES,
  isCodeIn,
} from '../types/crms';
import type { BleedingCode, MucusStretch, MucusModifier, StampType } from '../types/crms';

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
