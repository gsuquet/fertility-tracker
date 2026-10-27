import { describe, it, expect } from 'vitest';
import { BACKUP_REMINDER_DAYS, isBackupDue } from '../backupReminder';
import { makeObservation } from '../../test/factories';

const observations = [
  makeObservation({ date: '2026-09-10' }),
  makeObservation({ date: '2026-09-01' }),
];

describe('isBackupDue', () => {
  it('waits 30 days', () => {
    expect(BACKUP_REMINDER_DAYS).toBe(30);
  });

  it('is never due without observations', () => {
    expect(isBackupDue(null, [], '2027-01-01')).toBe(false);
    expect(isBackupDue('2026-01-01', [], '2027-01-01')).toBe(false);
  });

  it('counts from the last backup', () => {
    expect(isBackupDue('2026-09-20', observations, '2026-10-19')).toBe(false);
    expect(isBackupDue('2026-09-20', observations, '2026-10-20')).toBe(true);
  });

  it('counts from the earliest observation when there is no backup', () => {
    expect(isBackupDue(null, observations, '2026-09-30')).toBe(false);
    expect(isBackupDue(null, observations, '2026-10-01')).toBe(true);
  });

  it('counts from the earliest observation when the backup date is not valid', () => {
    expect(isBackupDue('garbage', observations, '2026-09-30')).toBe(false);
    expect(isBackupDue('garbage', observations, '2026-10-01')).toBe(true);
  });
});
