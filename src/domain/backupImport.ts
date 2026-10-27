import type { Observation } from '../types/crms';
import { groupObservationsIntoCycles } from './cycleBoundaryDetector';

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
 * An imported manual Peak Day clears the manual Peak Day of the current days in its cycle,
 * so each cycle keeps one manual Peak Day.
 */
export function mergeObservations(existing: Observation[], imported: Observation[]): Observation[] {
  const byDate = new Map(existing.map(o => [o.date, o]));
  for (const obs of imported) {
    byDate.set(obs.date, obs);
  }
  const merged = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  const importedDates = new Set(imported.map(o => o.date));
  const importedPeaks = new Set(imported.filter(o => o.isManualPeak).map(o => o.date));
  const datesToClear = new Set(
    groupObservationsIntoCycles(merged)
      .filter(c => c.observations.some(o => importedPeaks.has(o.date)))
      .flatMap(c => c.observations.map(o => o.date))
      .filter(date => !importedDates.has(date))
  );
  return merged.map(o => (datesToClear.has(o.date) ? { ...o, isManualPeak: false } : o));
}
