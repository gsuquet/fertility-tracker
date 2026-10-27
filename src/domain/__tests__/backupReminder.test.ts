import { describe, it, expect } from 'vitest';
import {
  BACKUP_REMINDER_DAYS,
  BACKUP_SNOOZE_DAYS,
  hasUserObservations,
  isBackupDue,
} from '../backupReminder';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../demoData';

const observations = [makeObservation({ date: '2026-09-10' })];
const noDates = { lastBackupDate: null, reminderStart: null, snoozedUntil: null };

describe('isBackupDue', () => {
  it('waits 30 days and snoozes for 7 days', () => {
    expect(BACKUP_REMINDER_DAYS).toBe(30);
    expect(BACKUP_SNOOZE_DAYS).toBe(7);
  });

  it('is never due without observations of the user', () => {
    const dates = { ...noDates, reminderStart: '2026-01-01' };
    expect(isBackupDue(dates, [], '2027-01-01')).toBe(false);
    expect(isBackupDue(dates, buildDemoObservations('2026-12-01'), '2027-01-01')).toBe(false);
  });

  it('counts from the last backup', () => {
    const dates = { ...noDates, lastBackupDate: '2026-09-20', reminderStart: '2026-01-01' };
    expect(isBackupDue(dates, observations, '2026-10-19')).toBe(false);
    expect(isBackupDue(dates, observations, '2026-10-20')).toBe(true);
  });

  it('counts from the start of the reminder when there is no valid backup date', () => {
    for (const lastBackupDate of [null, 'garbage']) {
      const dates = { ...noDates, lastBackupDate, reminderStart: '2026-10-01' };
      expect(isBackupDue(dates, observations, '2026-10-30')).toBe(false);
      expect(isBackupDue(dates, observations, '2026-10-31')).toBe(true);
    }
  });

  it('is not due without a valid start date', () => {
    expect(isBackupDue(noDates, observations, '2027-01-01')).toBe(false);
    expect(isBackupDue({ ...noDates, reminderStart: 'x' }, observations, '2027-01-01')).toBe(false);
  });

  it('is not due before the end of a snooze', () => {
    const dates = { lastBackupDate: null, reminderStart: '2026-01-01', snoozedUntil: '2026-11-03' };
    expect(isBackupDue(dates, observations, '2026-11-02')).toBe(false);
    expect(isBackupDue(dates, observations, '2026-11-03')).toBe(true);
    expect(isBackupDue({ ...dates, snoozedUntil: 'x' }, observations, '2026-11-02')).toBe(true);
  });
});

describe('hasUserObservations', () => {
  it('ignores demo days', () => {
    expect(hasUserObservations([])).toBe(false);
    expect(hasUserObservations(buildDemoObservations('2026-10-27'))).toBe(false);
    expect(hasUserObservations(observations)).toBe(true);
  });
});
