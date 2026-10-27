import type React from 'react';
import { useState } from 'react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { getTodayStr } from '../utils/dateUtils';
import { ConfirmDialog } from './ConfirmDialog';

/** Lets the user save the stored data that the app could not read, then delete the copy or close. */
export const StorageRecoveryNotice: React.FC = () => {
  const { recoveryData, recoveryKept, droppedCount, dismissRecovery } = useCycleData();
  const { t } = useLanguage();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (recoveryData === null) return null;

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([recoveryData], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fertility-tracker-data-recovery-${getTodayStr()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const r = t.storageRecovery;
  const message =
    droppedCount > 0
      ? (recoveryKept ? r.messagePartial : r.messagePartialNoCopy).replace(
          '{count}',
          String(droppedCount)
        )
      : recoveryKept
        ? r.message
        : r.messageNoCopy;

  return (
    <div className="storage-recovery-notice" role="alert">
      <p>{message}</p>
      <div className="storage-recovery-actions">
        <button type="button" className="btn btn-primary" onClick={handleDownload}>
          {t.storageRecovery.download}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={recoveryKept ? () => setIsConfirmOpen(true) : dismissRecovery}
        >
          {recoveryKept ? t.storageRecovery.dismiss : t.storageRecovery.close}
        </button>
      </div>
      {isConfirmOpen && (
        <ConfirmDialog
          title={t.confirmDialog.recoveryTitle}
          actions={[
            { label: t.confirmDialog.recoveryConfirm, onClick: dismissRecovery, danger: true },
          ]}
          onCancel={() => setIsConfirmOpen(false)}
        >
          <p>{t.confirmDialog.recoveryMessage}</p>
        </ConfirmDialog>
      )}
    </div>
  );
};
