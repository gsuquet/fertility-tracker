import type {
  BleedingCode,
  FrequencyCode,
  MucusModifier,
  MucusStretch,
  Observation,
  SymptomCode,
} from '../types/crms';
import { formatCodeString } from './codeParser';
import { isFirstBleedingDayOfSeries } from './cycleBoundaryDetector';

/** The values that the observation forms edit. */
export interface ObservationFields {
  bleeding?: BleedingCode | undefined;
  stretch?: MucusStretch | undefined;
  modifiers: MucusModifier[];
  frequency?: FrequencyCode | undefined;
  symptoms: SymptomCode[];
  intercourse: boolean;
  notes: string;
  isManualPeak: boolean;
  isCycleStart?: boolean | undefined;
}

export const EMPTY_FIELDS: ObservationFields = {
  modifiers: [],
  symptoms: [],
  intercourse: false,
  notes: '',
  isManualPeak: false,
};

/** The CrMS code fields: what **Copy yesterday** copies. */
export type CodeFields = Pick<
  ObservationFields,
  'bleeding' | 'stretch' | 'modifiers' | 'frequency' | 'symptoms'
>;

/**
 * Returns the code of an observation, without the I mark, the Peak Day, the notes and the cycle
 * start choice. These belong to their own day.
 */
export function codeFieldsOf(obs: Observation): CodeFields {
  return {
    bleeding: obs.bleeding,
    stretch: obs.stretch,
    modifiers: obs.modifiers ?? [],
    frequency: obs.frequency,
    symptoms: obs.symptoms ?? [],
  };
}

/** The code that Copy yesterday copies from a day, or null when the day has no code. */
export function copyableCode(obs: Observation | undefined): string | null {
  return obs ? formatCodeString(codeFieldsOf(obs)) || null : null;
}

/** Returns the form values of a saved observation, or empty values for a new day. */
export function fieldsFromObservation(obs: Observation | undefined): ObservationFields {
  if (!obs) return EMPTY_FIELDS;
  return {
    bleeding: obs.bleeding,
    stretch: obs.stretch,
    modifiers: obs.modifiers ?? [],
    frequency: obs.frequency,
    symptoms: obs.symptoms ?? [],
    intercourse: obs.intercourse ?? false,
    notes: obs.notes ?? '',
    isManualPeak: obs.isManualPeak ?? false,
    isCycleStart: obs.isCycleStart,
  };
}

const sameItems = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every(item => b.includes(item));

/** Tells if the form values differ from the saved observation (or from a blank day). */
export function hasFieldChanges(
  fields: ObservationFields,
  saved: Observation | undefined
): boolean {
  const base = fieldsFromObservation(saved);
  // A new day keeps no blank notes, so whitespace alone is not a change
  const notes = saved ? fields.notes : fields.notes.trim();
  return !(
    fields.bleeding === base.bleeding &&
    fields.stretch === base.stretch &&
    fields.frequency === base.frequency &&
    fields.intercourse === base.intercourse &&
    fields.isManualPeak === base.isManualPeak &&
    fields.isCycleStart === base.isCycleStart &&
    notes === base.notes &&
    sameItems(fields.modifiers, base.modifiers) &&
    sameItems(fields.symptoms, base.symptoms)
  );
}

/** Tells if the user must choose whether this bleeding day starts a new cycle. */
export function needsCycleStartChoice(
  fields: ObservationFields,
  date: string,
  observations: Observation[]
): boolean {
  return (
    fields.isCycleStart === undefined &&
    isFirstBleedingDayOfSeries({ date, bleeding: fields.bleeding }, observations)
  );
}
