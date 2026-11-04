/**
 * The canonical form of a day for the sync (ADR 0012). Two devices that have the same data give
 * the same canonical day, so the merge compares days and not the order of their fields.
 */
import type {
  BleedingCode,
  FrequencyCode,
  MucusModifier,
  MucusStretch,
  ObservationInput,
  SymptomCode,
} from '../../types/crms';

/** The fields of a day that sync, without the date. `isManualPeak` has its own clock. */
export interface SyncDay {
  bleeding?: BleedingCode;
  stretch?: MucusStretch;
  modifiers?: MucusModifier[];
  frequency?: FrequencyCode;
  symptoms?: SymptomCode[];
  intercourse?: true;
  notes?: string;
  isCycleStart?: boolean;
}

/** The fields in their fixed sequence: the comparison and the vault JSON use it. */
export const SYNC_DAY_FIELDS = [
  'bleeding',
  'stretch',
  'modifiers',
  'frequency',
  'symptoms',
  'intercourse',
  'notes',
  'isCycleStart',
] as const;

const sortedSet = <T extends string>(values: T[] | undefined): T[] | undefined =>
  values?.length ? [...new Set(values)].sort() : undefined;

/** Keeps the fields that sync, in their canonical form. */
export function toSyncDay(observation: ObservationInput): SyncDay {
  const day: SyncDay = {};
  const modifiers = sortedSet(observation.modifiers);
  const symptoms = sortedSet(observation.symptoms);
  if (observation.bleeding) day.bleeding = observation.bleeding;
  if (observation.stretch) day.stretch = observation.stretch;
  if (modifiers) day.modifiers = modifiers;
  if (observation.frequency) day.frequency = observation.frequency;
  if (symptoms) day.symptoms = symptoms;
  if (observation.intercourse) day.intercourse = true;
  if (observation.notes) day.notes = observation.notes;
  if (observation.isCycleStart !== undefined) day.isCycleStart = observation.isCycleStart;
  return day;
}

/** A text that is the same for two equal canonical days. `null` is a deleted or missing day. */
export const dayKey = (day: SyncDay | null): string =>
  day === null ? 'null' : JSON.stringify(SYNC_DAY_FIELDS.map(field => day[field] ?? null));

/** True when the two canonical days are the same. Two `null` values are the same. */
export const sameDay = (a: SyncDay | null, b: SyncDay | null): boolean => dayKey(a) === dayKey(b);
