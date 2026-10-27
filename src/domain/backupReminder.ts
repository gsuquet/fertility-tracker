import type { Observation } from '../types/crms';
import { getDaysDifference } from '../utils/dateUtils';

/** The number of days after the last backup before the app reminds the user. */
export const BACKUP_REMINDER_DAYS = 30;

/** The number of days that **Later** hides the reminder. */
export const BACKUP_SNOOZE_DAYS = 7;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEMO_ID_PREFIX = 'demo_';

export interface BackupReminderDates {
  /** The date of the last JSON backup. */
  lastBackupDate: string | null;
  /** The date of the first load of a version with the reminder. */
  reminderStart: string | null;
  /** The reminder stays hidden before this date. */
  snoozedUntil: string | null;
}

const validDate = (date: string | null): string | null =>
  date !== null && DATE_REGEX.test(date) ? date : null;

/**
 * True when the user has observations that are not demo data, no snooze is active, and
 * `BACKUP_REMINDER_DAYS` or more passed since the last backup. Without a valid last backup
 * date, the count starts at `reminderStart`.
 */
export function isBackupDue(
  dates: BackupReminderDates,
  observations: Observation[],
  today: string
): boolean {
  if (!observations.some(o => !o.id.startsWith(DEMO_ID_PREFIX))) return false;
  const snoozedUntil = validDate(dates.snoozedUntil);
  if (snoozedUntil !== null && today < snoozedUntil) return false;
  const since = validDate(dates.lastBackupDate) ?? validDate(dates.reminderStart);
  return since !== null && getDaysDifference(since, today) >= BACKUP_REMINDER_DAYS;
}
