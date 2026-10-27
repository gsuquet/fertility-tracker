import type React from 'react';
import { useState } from 'react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { BACKUP_REMINDER_DAYS, isBackupDue } from '../domain/backupReminder';
import { getTodayStr } from '../utils/dateUtils';

interface BackupReminderProps {
  /** Opens the export dialog, where the user can download a backup. */
  onOpenExport: () => void;
}

/** Reminds the user to download a backup when the last one is old or missing. */
export const BackupReminder: React.FC<BackupReminderProps> = ({ onOpenExport }) => {
  const { observations, lastBackupDate } = useCycleData();
  const { t } = useLanguage();
  const [isHidden, setIsHidden] = useState(false);

  if (isHidden || !isBackupDue(lastBackupDate, observations, getTodayStr())) return null;

  const message =
    lastBackupDate === null
      ? t.backupReminder.messageNever
      : t.backupReminder.message.replace('{days}', String(BACKUP_REMINDER_DAYS));

  return (
    <div className="storage-recovery-notice" role="note">
      <p>{message}</p>
      <div className="storage-recovery-actions">
        <button type="button" className="btn btn-primary" onClick={onOpenExport}>
          {t.backupReminder.backUpNow}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setIsHidden(true)}>
          {t.backupReminder.later}
        </button>
      </div>
    </div>
  );
};
