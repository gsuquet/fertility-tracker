import type React from 'react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';

export interface ConfirmAction {
  label: string;
  onClick: () => void;
  /** Shows the action as a destructive button. */
  danger?: boolean;
}

interface ConfirmDialogProps {
  title: string;
  /** The message. The dialog uses it as its accessible description. */
  children: React.ReactNode;
  actions: ConfirmAction[];
  onCancel: () => void;
}

/**
 * Asks the user to confirm an action, in place of window.confirm().
 * The focus starts on Cancel and goes back to the trigger when the dialog closes.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  children,
  actions,
  onCancel,
}) => {
  const { t } = useLanguage();
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement;
    cancelRef.current?.focus();
    return () => trigger.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  // Stop clicks here: through the portal, React sends them to the dialog under this one.
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) onCancel();
  };

  return createPortal(
    <div className="modal-overlay confirm-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-container confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        <div className="modal-body" id={`${id}-message`}>
          {children}
        </div>
        <div className="modal-footer">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel}>
            {t.actions.cancel}
          </button>
          {actions.map(action => (
            <button
              key={action.label}
              type="button"
              className={`btn ${action.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
