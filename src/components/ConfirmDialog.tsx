import type React from 'react';
import { useId, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from './Modal';

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
 * The focus starts on Cancel. The Modal primitive traps it and moves it back to the trigger.
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

  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-message`}
      onClose={onCancel}
      initialFocusRef={cancelRef}
      className="modal-overlay confirm-overlay"
      panelClassName="modal-container confirm-dialog"
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
    </Modal>
  );
};
