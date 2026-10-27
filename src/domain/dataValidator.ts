import {
  BLEEDING_CODES,
  FREQUENCY_CODES,
  MODIFIER_CODES,
  STRETCH_CODES,
  SYMPTOM_CODES,
  isCodeIn,
} from '../types/crms';
import type { Observation, MucusModifier, SymptomCode } from '../types/crms';
import { calculateStamp } from './stampCalculator';
import { appendMissingSymptoms, formatCodeString } from './codeParser';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates and sanitizes a single raw object into a conforming Observation record.
 * Returns null if the object is corrupted beyond recovery (e.g. missing or invalid date).
 */
export function validateObservation(raw: unknown): Observation | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Date is mandatory and must match YYYY-MM-DD
  if (typeof obj.date !== 'string' || !DATE_REGEX.test(obj.date)) {
    return null;
  }

  // Validate or fallback optional biomarker fields
  const bleeding = isCodeIn(BLEEDING_CODES, obj.bleeding) ? obj.bleeding : undefined;

  const stretch = isCodeIn(STRETCH_CODES, obj.stretch) ? obj.stretch : undefined;

  const modifiers: MucusModifier[] = Array.isArray(obj.modifiers)
    ? obj.modifiers.filter((m: unknown) => isCodeIn(MODIFIER_CODES, m))
    : [];

  const frequency = isCodeIn(FREQUENCY_CODES, obj.frequency) ? obj.frequency : undefined;

  const symptoms: SymptomCode[] = Array.isArray(obj.symptoms)
    ? [...new Set(obj.symptoms.filter((s: unknown) => isCodeIn(SYMPTOM_CODES, s)))]
    : [];

  const intercourse: boolean = Boolean(obj.intercourse);
  const notes: string = typeof obj.notes === 'string' ? obj.notes : '';
  const isManualPeak: boolean = Boolean(obj.isManualPeak);
  const isCycleStart: boolean | undefined =
    typeof obj.isCycleStart === 'boolean' ? obj.isCycleStart : undefined;

  const cycleDay: number = typeof obj.cycleDay === 'number' && obj.cycleDay > 0 ? obj.cycleDay : 1;

  const id: string =
    typeof obj.id === 'string' && obj.id.trim().length > 0
      ? obj.id
      : `obs_${obj.date}_${Date.now()}`;

  const stamp = calculateStamp(bleeding, stretch, modifiers);
  const storedCode = typeof obj.codeString === 'string' ? obj.codeString.trim() : '';
  // A stored lone 'B' or 'L' without bleeding is an appearance code. Rebuild it as '-B' or '-L'.
  const upperCode = storedCode.toUpperCase();
  const isLoneAppearanceCode =
    !bleeding && isCodeIn(BLEEDING_CODES, upperCode) && isCodeIn(MODIFIER_CODES, upperCode);
  const codeString =
    typeof obj.codeString === 'string' && storedCode.length > 0 && !isLoneAppearanceCode
      ? appendMissingSymptoms(obj.codeString, symptoms)
      : formatCodeString({
          bleeding,
          stretch,
          modifiers,
          frequency,
          symptoms,
          intercourse,
        });

  return {
    id,
    date: obj.date,
    cycleDay,
    bleeding,
    stretch,
    modifiers,
    frequency,
    symptoms,
    intercourse,
    notes,
    isManualPeak,
    isCycleStart,
    stamp,
    codeString,
  };
}
