import type React from 'react';
import { useId, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from './Modal';
import { useSheetDrag } from '../hooks/useSheetDrag';

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
  /** An error under the message, for an action that failed. */
  alert?: string | null | undefined;
  /** While an action runs, the buttons are disabled and nothing closes the dialog. */
  busy?: boolean | undefined;
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
  alert = null,
  busy = false,
}) => {
  const { t } = useLanguage();
  const cancel = () => {
    if (!busy) onCancel();
  };
  // On a phone, a drag down closes the dialog as the close button does
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(cancel, true);
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-message`}
      onClose={cancel}
      initialFocusRef={cancelRef}
      className="modal-overlay confirm-overlay"
      panelClassName="modal-container confirm-dialog"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <div className="modal-body" id={`${id}-message`} ref={bodyRef}>
        {children}
        {alert && (
          <p className="settings-alert" role="alert">
            {alert}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button
          ref={cancelRef}
          type="button"
          className="btn btn-secondary"
          onClick={cancel}
          disabled={busy}
        >
          {t.actions.cancel}
        </button>
        {actions.map(action => (
          <button
            key={action.label}
            type="button"
            className={`btn ${action.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={action.onClick}
            disabled={busy}
          >
            {action.label}
          </button>
        ))}
      </div>
    </Modal>
  );
};
