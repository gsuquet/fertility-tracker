import { screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { BackupReminder } from '../BackupReminder';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en, fr } from '../../i18n';

const LAST_BACKUP_KEY = 'fertility_care_last_backup';
const observations = [makeObservation({ date: '2026-09-01', bleeding: 'H' })];

describe('BackupReminder', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('reminds when the last backup is old, and hides on Later, in French', () => {
    localStorage.setItem(LAST_BACKUP_KEY, '2026-09-01');
    renderWithProviders(<BackupReminder onOpenExport={vi.fn()} />, {
      observations,
      language: 'fr',
    });
    expect(screen.getByRole('note')).toHaveTextContent(
      fr.backupReminder.message.replace('{days}', '30')
    );
    fireEvent.click(screen.getByRole('button', { name: fr.backupReminder.later }));
    expect(screen.queryByRole('note')).toBeNull();
  });
});
