import type { Observation } from '../types/crms';
import { getDaysDifference } from '../utils/dateUtils';

/** The number of days after the last backup before the app reminds the user. */
export const BACKUP_REMINDER_DAYS = 30;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when observations exist and `BACKUP_REMINDER_DAYS` or more passed since the last backup.
 * Without a valid last backup date, the count starts at the earliest observation.
 */
export function isBackupDue(
  lastBackupDate: string | null,
  observations: Observation[],
  today: string
): boolean {
  const earliest = observations.map(o => o.date).sort()[0];
  if (earliest === undefined) return false;
  const since = lastBackupDate && DATE_REGEX.test(lastBackupDate) ? lastBackupDate : earliest;
  return getDaysDifference(since, today) >= BACKUP_REMINDER_DAYS;
}
