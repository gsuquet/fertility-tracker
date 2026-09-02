import { describe, it, expect } from 'vitest';
import {
  getTodayStr,
  addDays,
  formatDateDisplay,
  formatDayOfWeek,
  getDaysDifference,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('getTodayStr', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const today = getTodayStr();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('addDays', () => {
    it('advances date by +1 day', () => {
      expect(addDays('2026-07-29', 1)).toBe('2026-07-30');
    });

    it('rewinds date by -1 day without skipping', () => {
      expect(addDays('2026-07-29', -1)).toBe('2026-07-28');
    });

    it('handles month boundary going forward', () => {
      expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    });

    it('handles month boundary going backward', () => {
      expect(addDays('2026-08-01', -1)).toBe('2026-07-31');
    });

    it('handles year boundary going forward', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('handles year boundary going backward', () => {
      expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    });

    it('handles leap years correctly', () => {
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
      expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    });

    it('handles invalid date strings gracefully', () => {
      expect(addDays('invalid-date', 1)).toBe('invalid-date');
    });
  });

  describe('formatDateDisplay', () => {
    it('formats date to long English locale display', () => {
      const formatted = formatDateDisplay('2026-07-29', 'en-US');
      expect(formatted).toContain('July');
      expect(formatted).toContain('29');
      expect(formatted).toContain('2026');
    });

    it('formats date to French locale display', () => {
      const formatted = formatDateDisplay('2026-07-29', 'fr-FR');
      expect(formatted.toLowerCase()).toContain('juillet');
      expect(formatted).toContain('2026');
    });
  });

  describe('formatDayOfWeek', () => {
    it('returns short weekday name', () => {
      const dayName = formatDayOfWeek('2026-07-29', 'en-US');
      expect(dayName).toMatch(/Wed|Wednesday/i);
    });
  });

  describe('getDaysDifference', () => {
    it('returns 0 for same dates', () => {
      expect(getDaysDifference('2026-07-20', '2026-07-20')).toBe(0);
    });

    it('returns correct day difference spanning days and months', () => {
      expect(getDaysDifference('2026-07-20', '2026-07-25')).toBe(5);
      expect(getDaysDifference('2026-07-25', '2026-08-05')).toBe(11);
    });

    it('handles reverse dates with negative values', () => {
      expect(getDaysDifference('2026-07-25', '2026-07-20')).toBe(-5);
    });
  });
});
