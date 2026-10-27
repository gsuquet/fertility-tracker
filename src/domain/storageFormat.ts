import type { Observation } from '../types/crms';
import { formatCodeString } from './codeParser';
import { validateObservation } from './dataValidator';

/**
 * The newest stored observation format that the app reads. Version 0 is a bare JSON array.
 * Version 1 is `{ schemaVersion: 1, observations: [...] }`.
 * The browser storage, the undo copy and the backup file use the same format.
 */
export const STORAGE_SCHEMA_VERSION = 1;

/**
 * The format that the app writes. It stays 0 (the bare array) so that version 1.17 and older,
 * for example after a rollback, can still read all the data. A later release sets it to 1.
 */
export const WRITE_SCHEMA_VERSION: 0 | 1 = 0;

export interface ObservationData {
  /** The valid observations, one for each date, in date order. */
  observations: Observation[];
  /** The number of records that failed validation and are not in `observations`. */
  droppedCount: number;
}

/** Writes the observations as a bare array (version 0) or in the versioned envelope (version 1). */
export function serializeObservations(
  observations: Observation[],
  indent?: number,
  version: 0 | 1 = WRITE_SCHEMA_VERSION
): string {
  const data = version === 0 ? observations : { schemaVersion: version, observations };
  return JSON.stringify(data, null, indent);
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
