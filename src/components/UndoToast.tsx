import type React from 'react';
import { createPortal } from 'react-dom';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { useTopDialog } from './Modal';

/**
 * After a change replaces the observations, offers to undo it or to delete the saved copy.
 * An open modal dialog makes the page inert, so the toast then renders in the top dialog.
 */
export const UndoToast: React.FC = () => {
  const { undoChange, undoLastChange, dismissUndo, undoPersisted } = useCycleData();
  const { t } = useLanguage();
  const topDialog = useTopDialog();

  if (undoChange === null) return null;

  // The buttons go away with the toast. In a dialog, the focus then goes to the dialog,
  // because the page under it is inert.
  const runAndKeepFocus = (action: () => void) => () => {
    action();
    topDialog?.focus();
  };

  const toast = (
    <div className="undo-toast" role="status">
      <span>
        {t.undoToast[undoChange]}
        {!undoPersisted && ` ${t.undoToast.notSaved}`}
      </span>
      <div className="undo-toast-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={runAndKeepFocus(undoLastChange)}
        >
          {t.undoToast.undo}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={runAndKeepFocus(dismissUndo)}
        >
          {t.undoToast.dismiss}
        </button>
      </div>
    </div>
  );
  return topDialog ? createPortal(toast, topDialog) : toast;
};
