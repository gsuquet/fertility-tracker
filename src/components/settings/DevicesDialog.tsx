/** The members of the vault, and the removal of a device. See docs/reference/screens/settings.md#device-list. */
import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import type { SyncControl, SyncServices } from '../../hooks/useSync';
import { useSheetDrag } from '../../hooks/useSheetDrag';
import type { DeviceRecord } from '../../sync/keyStore';
import type { DeviceEntry } from '../../sync/membership';
import { failureOf } from '../../utils/syncFailure';
import type { SyncFailure } from '../../utils/syncFailure';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';

interface DevicesDialogProps {
  control: SyncControl;
  /** Gets the new recovery code after the removal of an owner device. */
  onCode: (code: string) => void;
  onClose: () => void;
}

export const DevicesDialog: React.FC<DevicesDialogProps> = ({ control, onCode, onClose }) => {
  const { t } = useLanguage();
  const s = t.sync;
  const id = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [members, setMembers] = useState<DeviceEntry[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [failure, setFailure] = useState<SyncFailure | null>(null);
  const [removing, setRemoving] = useState<DeviceEntry | null>(null);
  const close = () => {
    if (!busy) onClose();
  };
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(close, true);

  const nameOf = (member: DeviceEntry) =>
    member.kind === 'recovery' ? s.deviceRecovery : (member.name ?? s.deviceNoName);

  /** Runs an action with the record of the key store and the sync lock, then loads the list. */
  const run = useCallback(
    async (action?: (services: SyncServices, record: DeviceRecord) => Promise<void>) => {
      setBusy(true);
      setFailure(null);
      try {
        const list = await control.withSync(async services => {
          const { relay, keyStore } = services;
          const { listMembers } = await import('../../sync/membership');
          // The record of the key store: a sync or another tab can change it
          const record = await keyStore.load();
          if (!record) return [];
          if (action) await action(services, record);
          return listMembers(relay, keyStore, (await keyStore.load()) as DeviceRecord);
        });
        setMembers(list);
      } catch (error) {
        setFailure(failureOf(error));
      } finally {
        setBusy(false);
      }
    },
    [control]
  );

  useEffect(() => {
    void run();
  }, [run]);

  const remove = (member: DeviceEntry) => {
    setRemoving(null);
    void run(async ({ relay, keyStore }, record) => {
      const { removeDevice } = await import('../../sync/membership');
      const result = await removeDevice(relay, keyStore, record, member.id);
      if (result.recoveryCode) onCode(result.recoveryCode);
    });
  };

  return (
    <>
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
          <h2 id={`${id}-title`}>{s.devices}</h2>
        </div>
        <div className="modal-body" ref={bodyRef}>
          <p id={`${id}-note`}>{s.devicesNote}</p>
          {members === null && busy && <p role="status">{s.working}</p>}
          {members && (
            <ul className="sync-devices">
              {members.map(member => (
                <li key={member.id} className="sync-device">
                  <div>
                    <p className="sync-device-name">{nameOf(member)}</p>
                    <p className="sync-device-detail">
                      {member.kind === 'recovery'
                        ? s.deviceRecoveryHint
                        : [
                            member.kind === 'this' ? s.deviceThis : null,
                            member.role === 'owner' ? s.deviceOwner : s.deviceReader,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                  </div>
                  {member.kind === 'other' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      aria-label={`${s.deviceRemove} ${nameOf(member)}`}
                      onClick={() => setRemoving(member)}
                      disabled={busy}
                    >
                      {s.deviceRemove}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {failure && (
            <p className="settings-alert" role="alert">
              {s[failure]}
            </p>
          )}
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
      {removing && (
        <ConfirmDialog
          title={formatMessage(s.removeTitle, { name: nameOf(removing) })}
          actions={[{ label: s.deviceRemove, onClick: () => remove(removing), danger: true }]}
          onCancel={() => setRemoving(null)}
        >
          <p>{removing.role === 'owner' ? s.removeOwnerMessage : s.removeMessage}</p>
        </ConfirmDialog>
      )}
    </>
  );
};
