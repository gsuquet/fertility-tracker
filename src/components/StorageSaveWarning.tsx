import type React from 'react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';

interface StorageSaveWarningProps {
  /** Opens the export dialog, where the user can download a backup. */
  onOpenExport: () => void;
}

/** Warns, until a save succeeds, that the browser refused to save the observations. */
export const StorageSaveWarning: React.FC<StorageSaveWarningProps> = ({ onOpenExport }) => {
  const { saveFailed } = useCycleData();
  const { t } = useLanguage();

  if (!saveFailed) return null;

  return (
    <div className="storage-recovery-notice" role="alert">
      <p>{t.storageWarning.saveFailed}</p>
      <div className="storage-recovery-actions">
        <button type="button" className="btn btn-primary" onClick={onOpenExport}>
          {t.storageWarning.backUpNow}
        </button>
      </div>
    </div>
  );
};
