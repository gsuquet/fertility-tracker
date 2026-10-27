import type { Observation } from '../types/crms';
import { formatCodeString } from './codeParser';
import { validateObservation } from './dataValidator';

/**
 * The version of the stored observation format. Version 0 is the bare JSON array that the
 * app wrote before 1.18.0. Version 1 is `{ schemaVersion: 1, observations: [...] }`.
 * The browser storage, the undo copy and the backup file use the same format.
 */
export const STORAGE_SCHEMA_VERSION = 1;

export interface ObservationData {
  /** The valid observations, one for each date, in date order. */
  observations: Observation[];
  /** The number of records that failed validation and are not in `observations`. */
  droppedCount: number;
}

/** Writes the observations in the current versioned envelope. */
export function serializeObservations(observations: Observation[], indent?: number): string {
  return JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, observations }, null, indent);
}

/**
 * Gives the raw records of a parsed value in a supported format, or null.
 * Add one step here for each new schema version.
 */
function migrateToCurrent(parsed: unknown): unknown[] | null {
  // Version 0: a bare array of observations.
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return null;
  const { schemaVersion, observations } = parsed as Record<string, unknown>;
  const isKnownVersion =
    typeof schemaVersion === 'number' &&
    Number.isInteger(schemaVersion) &&
    schemaVersion >= 1 &&
    schemaVersion <= STORAGE_SCHEMA_VERSION;
  if (!isKnownVersion || !Array.isArray(observations)) return null;
  return observations;
}

/**
 * Reads stored or backed-up observations in a supported format. Returns null when the
 * text is not JSON, is not a supported format, or comes from a newer schema version.
 * Calculates `codeString` again from the fields of each observation.
 */
export function parseObservationData(text: string): ObservationData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const records = migrateToCurrent(parsed);
  if (records === null) return null;

  const byDate = new Map<string, Observation>();
  let droppedCount = 0;
  for (const record of records) {
    const obs = validateObservation(record);
    if (obs) {
      byDate.set(obs.date, { ...obs, codeString: formatCodeString(obs) });
    } else {
      droppedCount++;
    }
  }
  const observations = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  return { observations, droppedCount };
}
