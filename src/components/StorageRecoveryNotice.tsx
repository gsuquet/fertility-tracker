import type React from 'react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { getTodayStr } from '../utils/dateUtils';

/** Lets the user save the stored data that the app could not read, then delete the copy or close. */
export const StorageRecoveryNotice: React.FC = () => {
  const { recoveryData, recoveryKept, dismissRecovery } = useCycleData();
  const { t } = useLanguage();

  if (recoveryData === null) return null;

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([recoveryData], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fertility-tracker-data-recovery-${getTodayStr()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="storage-recovery-notice" role="alert">
      <p>{recoveryKept ? t.storageRecovery.message : t.storageRecovery.messageNoCopy}</p>
      <div className="storage-recovery-actions">
        <button type="button" className="btn btn-primary" onClick={handleDownload}>
          {t.storageRecovery.download}
        </button>
        <button type="button" className="btn btn-secondary" onClick={dismissRecovery}>
          {recoveryKept ? t.storageRecovery.dismiss : t.storageRecovery.close}
        </button>
      </div>
    </div>
  );
};
