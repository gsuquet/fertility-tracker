import type React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SAVE_KEY_LABELS, SHORTCUT_IDS, SHORTCUT_LABELS } from '../domain/keyboardShortcuts';
import { setShortcutsEnabled, useShortcutsEnabled } from '../hooks/useKeyboardShortcuts';
import { Modal } from './Modal';
import { useSheetDrag } from '../hooks/useSheetDrag';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

/** The list of the keyboard shortcuts, with the switch that turns them on or off. */
export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  // On a phone, a drag down closes the dialog as the close button does
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(onClose, true);
  const enabled = useShortcutsEnabled();

  return (
    <Modal
      labelledBy="shortcuts-title"
      onClose={onClose}
      className="modal-overlay"
      panelClassName="modal-container shortcuts-container"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id="shortcuts-title">{t.shortcuts.title}</h2>
        <button
          type="button"
          className="icon-button close-modal-btn"
          onClick={onClose}
          aria-label={t.actions.close}
          title={t.actions.close}
        >
          <X size={20} />
        </button>
      </div>

      <div className="modal-body shortcuts-body" ref={bodyRef}>
        <label className="shortcuts-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setShortcutsEnabled(e.target.checked)}
            aria-describedby="shortcuts-toggle-hint"
          />
          <span>{t.shortcuts.enable}</span>
        </label>
        <p id="shortcuts-toggle-hint" className="shortcuts-hint">
          {t.shortcuts.enableHint}
        </p>

        <table className="shortcuts-table">
          <thead>
            <tr>
              <th scope="col">{t.shortcuts.keyColumn}</th>
              <th scope="col">{t.shortcuts.actionColumn}</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUT_IDS.map(id => (
              <tr key={id}>
                <td>
                  <kbd>{SHORTCUT_LABELS[id]}</kbd>
                </td>
                <td>{t.shortcuts.actions[id]}</td>
              </tr>
            ))}
            <tr>
              <td>
                {SAVE_KEY_LABELS.map(label => (
                  <kbd key={label}>{label}</kbd>
                ))}
              </td>
              <td>{t.shortcuts.save}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t.actions.close}
        </button>
      </div>
    </Modal>
  );
};
