import type React from 'react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';

/** After a change replaces the observations, offers to undo it or to delete the saved copy. */
export const UndoToast: React.FC = () => {
  const { undoChange, undoLastChange, dismissUndo, undoPersisted } = useCycleData();
  const { t } = useLanguage();

  if (undoChange === null) return null;

  return (
    <div className="undo-toast" role="status">
      <span>
        {t.undoToast[undoChange]}
        {!undoPersisted && ` ${t.undoToast.notSaved}`}
      </span>
      <div className="undo-toast-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={undoLastChange}>
          {t.undoToast.undo}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={dismissUndo}>
          {t.undoToast.dismiss}
        </button>
      </div>
    </div>
  );
};
