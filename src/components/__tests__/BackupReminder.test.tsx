import { screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { BackupReminder } from '../BackupReminder';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { en, fr } from '../../i18n';

const LAST_BACKUP_KEY = 'fertility_care_last_backup';
const REMINDER_START_KEY = 'fertility_care_backup_reminder_start';
const SNOOZE_KEY = 'fertility_care_backup_snoozed_until';
const observations = [makeObservation({ date: '2026-09-01', bleeding: 'H' })];

describe('BackupReminder', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(REMINDER_START_KEY, '2026-09-01');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 27, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing without observations', () => {
    renderWithProviders(<BackupReminder onOpenExport={vi.fn()} />);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('renders nothing for the demo data', () => {
    renderWithProviders(<BackupReminder onOpenExport={vi.fn()} />, {
      observations: buildDemoObservations('2026-10-27'),
    });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('renders nothing in the first 30 days after the first load or an upgrade', () => {
    localStorage.removeItem(REMINDER_START_KEY);
    renderWithProviders(<BackupReminder onOpenExport={vi.fn()} />, { observations });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('renders nothing after a recent backup', () => {
    localStorage.setItem(LAST_BACKUP_KEY, '2026-10-20');
    renderWithProviders(<BackupReminder onOpenExport={vi.fn()} />, { observations });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('reminds when there is no backup and opens the export dialog', () => {
    const onOpenExport = vi.fn();
    renderWithProviders(<BackupReminder onOpenExport={onOpenExport} />, { observations });
    expect(screen.getByRole('note')).toHaveTextContent(en.backupReminder.messageNever);
    fireEvent.click(screen.getByRole('button', { name: en.backupReminder.backUpNow }));
    expect(onOpenExport).toHaveBeenCalledOnce();
  });

  it('reminds when the last backup is old, and snoozes on Later after a reload, in French', () => {
    localStorage.setItem(LAST_BACKUP_KEY, '2026-09-01');
    const { unmount } = renderWithProviders(<BackupReminder onOpenExport={vi.fn()} />, {
      observations,
      language: 'fr',
    });
    expect(screen.getByRole('note')).toHaveTextContent(
      fr.backupReminder.message.replace('{days}', '30')
    );
    fireEvent.click(screen.getByRole('button', { name: fr.backupReminder.later }));
    expect(screen.queryByRole('note')).toBeNull();
    expect(localStorage.getItem(SNOOZE_KEY)).toBe('2026-11-03');
    unmount();

    renderWithProviders(<BackupReminder onOpenExport={vi.fn()} />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
