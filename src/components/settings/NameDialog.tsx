/** Asks for the name of this device before Turn on sync. See docs/reference/screens/settings.md#name-dialog. */
import type React from 'react';
import { useId, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { cleanDeviceName } from '../../domain/vault/deviceName';
import { useSheetDrag } from '../../hooks/useSheetDrag';
import { DeviceNameField } from '../DeviceNameField';
import { Modal } from '../Modal';

interface NameDialogProps {
  /** Gets the name without spaces at the start and at the end. */
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export const NameDialog: React.FC<NameDialogProps> = ({ onSubmit, onCancel }) => {
  const { t } = useLanguage();
  const s = t.sync;
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(onCancel, true);
  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-note`}
      onClose={onCancel}
      initialFocusRef={inputRef}
      className="modal-overlay confirm-overlay"
      panelClassName="modal-container confirm-dialog"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id={`${id}-title`}>{s.nameTitle}</h2>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          const clean = cleanDeviceName(name);
          if (clean === null) setInvalid(true);
          else onSubmit(clean);
        }}
        noValidate
      >
        <div className="modal-body password-dialog-body" ref={bodyRef}>
          <p id={`${id}-note`}>{s.nameNote}</p>
          <DeviceNameField
            value={name}
            onChange={value => {
              setName(value);
              setInvalid(false);
            }}
            invalid={invalid}
            inputRef={inputRef}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t.actions.cancel}
          </button>
          <button type="submit" className="btn btn-primary">
            {s.turnOn}
          </button>
        </div>
      </form>
    </Modal>
  );
};
