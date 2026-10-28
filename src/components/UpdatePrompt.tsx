import type React from 'react';
import { RefreshCw } from 'lucide-react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { applyUpdate, useUpdateReady } from '../pwa/registerServiceWorker';
import { useTopDialog } from './Modal';

/**
 * Tells the user that a new version waits, with a Reload button. It hides while a dialog or the
 * drawer is open, so an update never interrupts an entry, and while the undo message shows.
 */
export const UpdatePrompt: React.FC = () => {
  const { t } = useLanguage();
  const updateReady = useUpdateReady();
  const topDialog = useTopDialog();
  const { undoChange } = useCycleData();
  // The undo message has the same place, so the update message waits for it too
  if (!updateReady || topDialog !== null || undoChange !== null) return null;

  return (
    <div className="update-prompt" role="status">
      <span>{t.update.ready}</span>
      <button type="button" className="btn btn-primary" onClick={applyUpdate}>
        <RefreshCw size={16} aria-hidden="true" />
        <span>{t.update.reload}</span>
      </button>
    </div>
  );
};
