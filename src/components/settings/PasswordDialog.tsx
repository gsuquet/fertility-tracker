import type React from 'react';
import { useId, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MIN_PASSWORD_LENGTH } from '../../domain/encryptedBackup';
import { useSheetDrag } from '../../hooks/useSheetDrag';
import { Modal } from '../Modal';

type PasswordError = 'tooShort' | 'mismatch' | 'failed' | 'wrongPassword';

interface PasswordDialogProps {
  mode: 'backup' | 'restore';
  /**
   * Encrypts or decrypts with the password. True when it worked: the parent then closes the
   * dialog. False shows the error of the mode.
   */
  onSubmit: (password: string) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Asks for the password of an encrypted backup file (ADR 0012, step 1). The backup mode asks
 * for the password two times and checks its length. The restore mode asks one time.
 */
export const PasswordDialog: React.FC<PasswordDialogProps> = ({ mode, onSubmit, onCancel }) => {
  const { t } = useLanguage();
  const p = t.passwordDialog;
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(onCancel, true);
  const id = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<PasswordError | null>(null);
  const [working, setWorking] = useState(false);
  const isBackup = mode === 'backup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (working) return;
    if (isBackup && password.length < MIN_PASSWORD_LENGTH) {
      setError('tooShort');
      return;
    }
    if (isBackup && password !== confirm) {
      setError('mismatch');
      return;
    }
    setError(null);
    setWorking(true);
    // On success, the parent unmounts the dialog: no state changes after it
    if (!(await onSubmit(password))) {
      setWorking(false);
      setError(isBackup ? 'failed' : 'wrongPassword');
    }
  };

  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-note`}
      onClose={onCancel}
      initialFocusRef={passwordRef}
      className="modal-overlay confirm-overlay"
      panelClassName="modal-container confirm-dialog"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id={`${id}-title`}>{isBackup ? p.backupTitle : p.restoreTitle}</h2>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body password-dialog-body" ref={bodyRef}>
          <p id={`${id}-note`}>{isBackup ? p.backupNote : p.restoreNote}</p>
          <div className="form-group">
            <label htmlFor={`${id}-password`}>{p.password}</label>
            <input
              ref={passwordRef}
              id={`${id}-password`}
              className="form-input"
              type="password"
              autoComplete={isBackup ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {isBackup && (
            <div className="form-group">
              <label htmlFor={`${id}-confirm`}>{p.confirm}</label>
              <input
                id={`${id}-confirm`}
                className="form-input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
          )}
          {error && (
            <p className="settings-alert" role="alert">
              {p[error]}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t.actions.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={working}>
            {working ? p.working : isBackup ? p.save : p.open}
          </button>
        </div>
      </form>
    </Modal>
  );
};
