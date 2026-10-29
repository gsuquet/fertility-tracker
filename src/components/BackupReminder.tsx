import type React from 'react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { BACKUP_REMINDER_DAYS, isBackupDue } from '../domain/backupReminder';
import { getTodayStr } from '../utils/dateUtils';

interface BackupReminderProps {
  /** Downloads a backup file at once. */
  onBackUp: () => void;
}

/** Reminds the user to download a backup when the last one is old or missing. */
export const BackupReminder: React.FC<BackupReminderProps> = ({ onBackUp }) => {
  const {
    observations,
    lastBackupDate,
    backupReminderStart,
    backupSnoozedUntil,
    snoozeBackupReminder,
  } = useCycleData();
  const { t } = useLanguage();

  const dates = {
    lastBackupDate,
    reminderStart: backupReminderStart,
    snoozedUntil: backupSnoozedUntil,
  };
  if (!isBackupDue(dates, observations, getTodayStr())) return null;

  const message =
    lastBackupDate === null
      ? t.backupReminder.messageNever
      : t.backupReminder.message.replace('{days}', String(BACKUP_REMINDER_DAYS));

  return (
    <div className="storage-recovery-notice" role="note">
      <p>{message}</p>
      <div className="storage-recovery-actions">
        <button type="button" className="btn btn-primary" onClick={onBackUp}>
          {t.backupReminder.backUpNow}
        </button>
        <button type="button" className="btn btn-secondary" onClick={snoozeBackupReminder}>
          {t.backupReminder.later}
        </button>
      </div>
    </div>
  );
};
