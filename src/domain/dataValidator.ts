import {
  Observation,
  BleedingCode,
  MucusStretch,
  MucusModifier,
  FrequencyCode,
  SymptomCode,
} from '../types/crms';
import { calculateStamp } from './stampCalculator';
import { formatCodeString } from './codeParser';

const VALID_BLEEDING: Set<string> = new Set(['H', 'M', 'L', 'VL', 'B']);
const VALID_STRETCH: Set<string> = new Set([
  '0',
  '2',
  '2W',
  '4',
  '6',
  '8',
  '10',
  '10DL',
  '10SL',
  '10WL',
]);
const VALID_MODIFIERS: Set<string> = new Set(['B', 'C', 'C/K', 'G', 'K', 'L', 'P', 'Y']);
const VALID_FREQUENCY: Set<string> = new Set(['X1', 'X2', 'X3', 'AD']);
const VALID_SYMPTOMS: Set<string> = new Set(['AP', 'RAP', 'LAP']);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates and sanitizes a single raw object into a conforming Observation record.
 * Returns null if the object is corrupted beyond recovery (e.g. missing or invalid date).
 */
export function validateObservation(raw: unknown): Observation | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, any>;

  // Date is mandatory and must match YYYY-MM-DD
  if (typeof obj.date !== 'string' || !DATE_REGEX.test(obj.date)) {
    return null;
  }

  // Validate or fallback optional biomarker fields
  const bleeding: BleedingCode | undefined = VALID_BLEEDING.has(obj.bleeding)
    ? (obj.bleeding as BleedingCode)
    : undefined;

  const stretch: MucusStretch | undefined = VALID_STRETCH.has(obj.stretch)
    ? (obj.stretch as MucusStretch)
    : undefined;

  const modifiers: MucusModifier[] = Array.isArray(obj.modifiers)
    ? obj.modifiers.filter((m: any): m is MucusModifier => VALID_MODIFIERS.has(m))
    : [];

  const frequency: FrequencyCode | undefined = VALID_FREQUENCY.has(obj.frequency)
    ? (obj.frequency as FrequencyCode)
    : undefined;

  const symptoms: SymptomCode[] = Array.isArray(obj.symptoms)
    ? obj.symptoms.filter((s: any): s is SymptomCode => VALID_SYMPTOMS.has(s))
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
  const codeString =
    typeof obj.codeString === 'string' && obj.codeString.trim().length > 0
      ? obj.codeString
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

/**
 * Validates an array of raw items, filtering out malformed entries and deduplicating by date.
 */
export function validateObservationsArray(rawList: unknown): Observation[] {
  if (!Array.isArray(rawList)) return [];

  const validMap = new Map<string, Observation>();

  for (const item of rawList) {
    const validated = validateObservation(item);
    if (validated) {
      validMap.set(validated.date, validated);
    }
  }

  return Array.from(validMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Safely parses and validates a JSON string payload from backup or localStorage.
 * Returns null if the payload is not valid JSON or does not contain an array.
 */
export function parseAndValidateObservationsJson(jsonStr: string): Observation[] | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return null;
    return validateObservationsArray(parsed);
  } catch (_e) {
    return null;
  }
}
