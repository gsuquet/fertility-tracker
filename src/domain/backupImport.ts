import type { Observation } from '../types/crms';

/** How a backup file changes the current observations. */
export type ImportMode = 'replace' | 'merge';

export interface BackupSummary {
  count: number;
  /** The earliest date in the file, or null when the file has no observations. */
  firstDate: string | null;
  /** The latest date in the file, or null when the file has no observations. */
  lastDate: string | null;
}

/** Gives the number of observations and their date range, for the import preview. */
export function summarizeObservations(observations: Observation[]): BackupSummary {
  const dates = observations.map(o => o.date).sort();
  return {
    count: dates.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  };
}

/**
 * Merges imported observations into the current ones. An imported day replaces the current
 * day with the same date. The other current days stay. The result is in date order.
 */
export function mergeObservations(existing: Observation[], imported: Observation[]): Observation[] {
  const byDate = new Map(existing.map(o => [o.date, o]));
  for (const obs of imported) {
    byDate.set(obs.date, obs);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
