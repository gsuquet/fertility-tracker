/**
 * Helper utilities for timezone-safe YYYY-MM-DD date string operations.
 */

/**
 * Returns today's local date in YYYY-MM-DD format.
 */
export const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Safely adds or subtracts days from a YYYY-MM-DD date string.
 * Uses pure UTC date math to avoid local timezone offset and DST shifts.
 */
export const addDays = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return dateStr;
  }
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().split('T')[0];
};

/**
 * Formats a YYYY-MM-DD date string for UI display.
 */
export const formatDateDisplay = (
  dateStr: string,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(locale, options);
  } catch (e) {
    return dateStr;
  }
};

/**
 * Formats short day of week (e.g. Mon, Tue / Lun, Mar) for a YYYY-MM-DD string.
 */
export const formatDayOfWeek = (dateStr: string, locale: string = 'en-US'): string => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(locale, { weekday: 'short' });
  } catch (e) {
    return '';
  }
};
