/** The days that lost a conflict of the sync. See docs/reference/screens/settings.md#conflict-dialog. */
import type React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { useCycleData } from '../../context/CycleContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCodeString } from '../../domain/codeParser';
import type { SyncConflict } from '../../domain/sync/merge';
import type { SyncControl } from '../../hooks/useSync';
import { useSheetDrag } from '../../hooks/useSheetDrag';
import type { ObservationInput } from '../../types/crms';
import { formatDateDisplay } from '../../utils/dateUtils';
import { Modal } from '../Modal';

interface ConflictDialogProps {
  control: SyncControl;
  onClose: () => void;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({ control, onClose }) => {
  const { t } = useLanguage();
  const s = t.sync;
  const { observations } = useCycleData();
  const id = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const { conflicts } = control;
  const close = () => {
    if (!busy) onClose();
  };
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(close, true);

  // The last conflict went: the dialog has nothing to show
  const empty = conflicts.length === 0;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (empty) onCloseRef.current();
  }, [empty]);

  /** The code of a day, then its note. */
  const versionOf = (day: ObservationInput | null | undefined, missing: string) => {
    if (!day) return missing;
    const code = formatCodeString(day) || s.conflictNoCode;
    return day.notes ? `${code} · ${day.notes}` : code;
  };

  const resolve = async (conflict: SyncConflict, restore: boolean) => {
    setBusy(true);
    try {
      await control.resolveConflict(conflict, restore);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-note`}
      onClose={close}
      initialFocusRef={closeRef}
      className="modal-overlay confirm-overlay"
      panelClassName="modal-container confirm-dialog"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id={`${id}-title`}>{s.conflicts}</h2>
      </div>
      <div className="modal-body" ref={bodyRef}>
        <p id={`${id}-note`}>{s.conflictsNote}</p>
        <ul className="sync-conflicts">
          {conflicts.map(conflict => {
            const current = observations.find(observation => observation.date === conflict.date);
            const other = conflict.day && { date: conflict.date, ...conflict.day };
            return (
              <li key={conflict.date} className="sync-conflict">
                <h3>
                  {formatDateDisplay(conflict.date, t.locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </h3>
                <dl>
                  <dt>{s.conflictOther}</dt>
                  <dd>{versionOf(other, s.conflictDeleted)}</dd>
                  <dt>{s.conflictNow}</dt>
                  <dd>{versionOf(current, s.conflictNone)}</dd>
                </dl>
                <div className="sync-conflict-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void resolve(conflict, false)}
                    disabled={busy}
                  >
                    {s.conflictDismiss}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void resolve(conflict, true)}
                    disabled={busy}
                  >
                    {s.conflictRestore}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="modal-footer">
        <button
          ref={closeRef}
          type="button"
          className="btn btn-secondary"
          onClick={close}
          disabled={busy}
        >
          {t.actions.close}
        </button>
      </div>
    </Modal>
  );
};
