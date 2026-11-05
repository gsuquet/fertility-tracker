/** The frame of the invitation dialog and of the join dialog. See docs/reference/screens/settings.md. */
import type React from 'react';
import { useId } from 'react';
import { failureOf } from '../utils/syncFailure';
import { Modal } from './Modal';
import { SyncAlert } from './SyncAlert';

/** The time between two checks of an invitation on the relay. */
export const INVITE_POLL_MS = 3_000;

/** True for a failure that the next check can repair: no connection, or no relay yet. */
export const isTemporary = (error: unknown) => {
  const failure = failureOf(error);
  return failure === 'noConnection' || failure === 'unavailable';
};

/** The 6-digit code in two groups of 3. */
export const codeText = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

export interface StepAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface SyncStepDialogProps {
  title: string;
  /** The text of the step, read aloud when it changes. */
  status: string;
  /** A failure. It has role alert. */
  alert?: string | null;
  /** The code to compare, or the link to copy. */
  children?: React.ReactNode;
  actions: StepAction[];
  /** Escape, Back and the backdrop. Null while a step must not stop. */
  onClose: (() => void) | null;
  /** Reload of an expired sign-in, in place of the default one. */
  onReload?: () => void;
}

export const SyncStepDialog: React.FC<SyncStepDialogProps> = ({
  title,
  status,
  alert = null,
  children,
  actions,
  onClose,
  onReload,
}) => {
  const id = useId();
  return (
    <Modal
      labelledBy={`${id}-title`}
      onClose={() => onClose?.()}
      className="modal-overlay confirm-overlay"
      panelClassName="modal-container confirm-dialog"
    >
      <div className="modal-header">
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <div className="modal-body password-dialog-body">
        <p role="status">{status}</p>
        {children}
        {alert && <SyncAlert text={alert} onReload={onReload} />}
      </div>
      {actions.length > 0 && (
        <div className="modal-footer">
          {actions.map(action => (
            <button
              key={action.label}
              type="button"
              className={`btn ${action.primary ? 'btn-primary' : 'btn-secondary'}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
