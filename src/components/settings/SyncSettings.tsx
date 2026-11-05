/** The Sync group of Settings. See docs/reference/screens/settings.md#sync-group. */
import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CloudOff, KeyRound, RefreshCw, RotateCcw, Share2 } from 'lucide-react';
import { useCycle } from '../../context/CycleContext';
import { useLanguage } from '../../context/LanguageContext';
import { isUserObservation } from '../../domain/backupReminder';
import { formatMessage } from '../../i18n';
import type { TranslationSchema } from '../../i18n/types';
import type { SyncControl, SyncServices } from '../../hooks/useSync';
import { useSheetDrag } from '../../hooks/useSheetDrag';
import type { VaultError } from '../../sync/deviceVault';
import type { DeviceRecord } from '../../sync/keyStore';
import { formatDateDisplay } from '../../utils/dateUtils';
import { removeStorage } from '../../utils/storage';
import { STORAGE_SYNC_CONFLICTS_KEY, STORAGE_SYNC_STATE_KEY } from '../../utils/storageKeys';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { ActionRow, Group, iconOf } from './settingsRows';

type SyncText = TranslationSchema['sync'];
type Failure = 'noConnection' | 'unavailable' | 'badCode' | 'failed';

/** The cause of a failure, for the alert under the group. */
export const failureOf = (error: unknown, recovering = false): Failure => {
  // The name, not instanceof: the vault code loads only when the sync starts
  if (!(error instanceof Error) || error.name !== 'VaultError') return 'failed';
  const { reason, detail } = error as VaultError;
  if (reason === 'code') return 'badCode';
  if (reason !== 'relay') return 'failed';
  const status = detail?.status;
  if (status === 0) return 'noConnection';
  if (status === 503) return 'unavailable';
  // The relay has no lookup object for this code
  if (recovering && status === 404) return 'badCode';
  return 'failed';
};

interface RecoveryCodeDialogProps {
  code: string;
  onDone: () => void;
}

/** Shows a new recovery code. Only I wrote it down closes it. */
export const RecoveryCodeDialog: React.FC<RecoveryCodeDialogProps> = ({ code, onDone }) => {
  const { t } = useLanguage();
  const s = t.sync;
  const id = useId();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(
      () => setCopied(true),
      () => setCopied(false)
    );
  };
  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-note`}
      // Escape, Back and the backdrop do nothing: the user must see the code
      onClose={() => {}}
      className="modal-overlay confirm-overlay"
      panelClassName="modal-container confirm-dialog"
    >
      <div className="modal-header">
        <h2 id={`${id}-title`}>{s.codeTitle}</h2>
      </div>
      <div className="modal-body password-dialog-body">
        <p id={`${id}-note`}>{s.codeNote}</p>
        <p className="sync-code">{code}</p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={copy}>
          {copied ? s.copied : s.copy}
        </button>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          {s.wroteItDown}
        </button>
      </div>
    </Modal>
  );
};

interface RecoveryEntryDialogProps {
  /** Recovers with the code. The parent closes the dialog when it worked. */
  onSubmit: (code: string) => void;
  onCancel: () => void;
  working: boolean;
  error: string | null;
}

/** Asks for the recovery code of a vault. */
export const RecoveryEntryDialog: React.FC<RecoveryEntryDialogProps> = ({
  onSubmit,
  onCancel,
  working,
  error,
}) => {
  const { t } = useLanguage();
  const s = t.sync;
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  // The recovery makes a new code: the dialog stays open until it ends
  const cancel = () => {
    if (!working) onCancel();
  };
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(cancel, true);
  return (
    <Modal
      labelledBy={`${id}-title`}
      describedBy={`${id}-note`}
      onClose={cancel}
      initialFocusRef={inputRef}
      className="modal-overlay confirm-overlay"
      panelClassName="modal-container confirm-dialog"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id={`${id}-title`}>{s.enterTitle}</h2>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!working) onSubmit(code);
        }}
        noValidate
      >
        <div className="modal-body password-dialog-body" ref={bodyRef}>
          <p id={`${id}-note`}>{s.enterNote}</p>
          <div className="form-group">
            <label htmlFor={`${id}-code`}>{s.codeLabel}</label>
            <input
              ref={inputRef}
              id={`${id}-code`}
              className="form-input sync-code-input"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={code}
              onChange={e => setCode(e.target.value)}
            />
          </div>
          {error && (
            <p className="settings-alert" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={cancel} disabled={working}>
            {t.actions.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={working}>
            {working ? s.working : s.recoverAction}
          </button>
        </div>
      </form>
    </Modal>
  );
};

interface SyncSettingsProps {
  control: SyncControl;
  /** Tells Settings when the device has a record, or not. */
  onRecordChange: (hasRecord: boolean) => void;
  /** Tells Settings when an action starts and ends. Settings does not close while it runs. */
  onBusyChange: (busy: boolean) => void;
}

/** The rows of the sync. While a row runs, all the rows are disabled. */
export const SyncSettings: React.FC<SyncSettingsProps> = ({
  control,
  onRecordChange,
  onBusyChange,
}) => {
  const { lastSyncDate, observations, applySyncedObservations } = useCycle();
  const { t } = useLanguage();
  const s: SyncText = t.sync;
  const [record, setRecord] = useState<DeviceRecord | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // An action that makes a recovery code runs
  const [making, setMaking] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const onRecordRef = useRef(onRecordChange);
  onRecordRef.current = onRecordChange;
  const onBusyRef = useRef(onBusyChange);
  onBusyRef.current = onBusyChange;
  // A new recovery code must show: Settings stays open until the user closes the code dialog
  const holding = making || code !== null;
  useEffect(() => onBusyRef.current(holding), [holding]);

  const show = useCallback((next: DeviceRecord | null) => {
    setRecord(next);
    onRecordRef.current(next !== null);
  }, []);

  // The record loads when the group opens
  const { services } = control;
  useEffect(() => {
    void services()
      .then(({ keyStore }) => keyStore.load())
      .then(show, () => setFailure('failed'));
  }, [services, show]);

  /** Runs one action with the services. The action gives the new record and a code to show. */
  const run = async (
    action: (services: SyncServices) => Promise<{ record: DeviceRecord | null; code?: string }>,
    { recovering = false, makesCode = true } = {}
  ) => {
    // The disabled rows and the disabled Recover button stop a second action
    setBusy(true);
    setMaking(makesCode);
    setFailure(null);
    try {
      const result = await control.withSync(action);
      show(result.record);
      if (result.code) setCode(result.code);
      setEntering(false);
      if (result.record) void control.syncNow();
    } catch (error) {
      setFailure(failureOf(error, recovering));
      // A recovery can save the record before its new code fails: the rows follow the key store
      await control
        .services()
        .then(({ keyStore }) => keyStore.load())
        .then(show, () => {});
    } finally {
      setBusy(false);
      setMaking(false);
    }
  };

  // The demo days never go into a vault (ADR 0012): they go before the device joins
  const removeDemoDays = () => {
    const kept = observations.filter(isUserObservation);
    if (kept.length === observations.length) return;
    if (!applySyncedObservations(kept, false)) throw new Error('The browser refused the write');
  };

  /** The record of the key store. Another tab can save one after the group opens. */
  const joined = async (keyStore: SyncServices['keyStore']) => {
    const current = await keyStore.load();
    return current && { record: current };
  };

  const turnOn = () =>
    run(async ({ relay, keyStore }) => {
      const existing = await joined(keyStore);
      if (existing) return existing;
      removeDemoDays();
      const { createVault } = await import('../../sync/deviceVault');
      const made = await createVault(relay, keyStore);
      return { record: made.record, code: made.recoveryCode };
    });

  const recover = (typed: string) =>
    run(
      async ({ relay, keyStore }) => {
        const existing = await joined(keyStore);
        if (existing) return existing;
        removeDemoDays();
        const { recoverWithCode } = await import('../../sync/membership');
        const made = await recoverWithCode(relay, keyStore, typed);
        return { record: made.record, code: made.recoveryCode };
      },
      { recovering: true }
    );

  const newCode = () =>
    run(async ({ relay, keyStore }) => {
      // The record of the key store: a sync can change it after the group opens
      const current = await keyStore.load();
      if (!current) return { record: null };
      const { newRecoveryCode } = await import('../../sync/membership');
      const made = await newRecoveryCode(relay, keyStore, current);
      return { record: made.record, code: made.recoveryCode };
    });

  const turnOff = () => {
    setConfirmOff(false);
    void run(
      async ({ keyStore }) => {
        await keyStore.clear();
        removeStorage(STORAGE_SYNC_STATE_KEY);
        removeStorage(STORAGE_SYNC_CONFLICTS_KEY);
        return { record: null };
      },
      { makesCode: false }
    );
  };

  const syncNow = async () => {
    setBusy(true);
    setFailure(null);
    await control.syncNow();
    setBusy(false);
  };

  const lastSync =
    lastSyncDate === null
      ? s.notSynced
      : formatMessage(s.lastSync, {
          date: formatDateDisplay(lastSyncDate, t.locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
        });
  // The error of the last sync shows only when no action failed
  const shown = failure ?? (record && control.lastError ? failureOf(control.lastError) : null);
  // The code dialog shows its own error
  const alert = entering ? null : shown;

  return (
    <>
      <Group id="settings-sync" title={s.group}>
        {record === null && (
          <>
            <ActionRow
              icon={iconOf(Share2)}
              label={s.turnOn}
              detail={s.turnOnHint}
              onClick={() => void turnOn()}
              disabled={busy}
            />
            <ActionRow
              icon={iconOf(KeyRound)}
              label={s.recover}
              detail={s.recoverHint}
              onClick={() => {
                setFailure(null);
                setEntering(true);
              }}
              disabled={busy}
              opens
            />
          </>
        )}
        {record && (
          <>
            <ActionRow
              icon={iconOf(RefreshCw)}
              label={s.syncNow}
              detail={lastSync}
              onClick={() => void syncNow()}
              disabled={busy}
            />
            {record.role === 'owner' && (
              <ActionRow
                icon={iconOf(RotateCcw)}
                label={s.newCode}
                detail={s.newCodeHint}
                onClick={() => void newCode()}
                disabled={busy}
              />
            )}
            <ActionRow
              icon={iconOf(CloudOff)}
              label={s.turnOff}
              onClick={() => setConfirmOff(true)}
              disabled={busy}
              danger
            />
          </>
        )}
      </Group>
      {alert && (
        <p className="settings-alert" role="alert">
          {s[alert]}
        </p>
      )}

      {entering && (
        <RecoveryEntryDialog
          onSubmit={typed => void recover(typed)}
          onCancel={() => {
            setEntering(false);
            setFailure(null);
          }}
          working={busy}
          error={shown && s[shown]}
        />
      )}

      {code && <RecoveryCodeDialog code={code} onDone={() => setCode(null)} />}

      {confirmOff && (
        <ConfirmDialog
          title={s.turnOffTitle}
          actions={[{ label: s.turnOffConfirm, onClick: turnOff, danger: true }]}
          onCancel={() => setConfirmOff(false)}
        >
          <p>{s.turnOffMessage}</p>
        </ConfirmDialog>
      )}
    </>
  );
};
