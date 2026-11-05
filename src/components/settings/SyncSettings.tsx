/** The Sync group of Settings. See docs/reference/screens/settings.md#sync-group. */
import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  CloudOff,
  EyeOff,
  History,
  KeyRound,
  Link,
  RefreshCw,
  RotateCcw,
  Share2,
  Smartphone,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCycle } from '../../context/CycleContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage, isSingular } from '../../i18n';
import type { TranslationSchema } from '../../i18n/types';
import type { SyncControl, SyncServices } from '../../hooks/useSync';
import { useSheetDrag } from '../../hooks/useSheetDrag';
import type { DeviceRecord } from '../../sync/keyStore';
import { formatDateDisplay } from '../../utils/dateUtils';
import { readStorage, removeStorage } from '../../utils/storage';
import {
  STORAGE_LAST_SYNC_AT_KEY,
  STORAGE_SHARED_CHART_KEY,
  STORAGE_SHARED_READ_KEY,
  STORAGE_SYNC_CONFLICTS_KEY,
  STORAGE_SYNC_STATE_KEY,
} from '../../utils/storageKeys';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { useDemoRemoval } from '../../hooks/useDemoRemoval';
import { failureCodeOf, failureOf, isStale, isStorageBlocked } from '../../utils/syncFailure';
import { signInAgain } from '../../utils/signIn';
import type { SyncFailure } from '../../utils/syncFailure';
import { JoinDialog } from '../JoinDialog';
import { cleanDeviceName } from '../../domain/vault/deviceName';
import { DeviceNameField } from '../DeviceNameField';
import { ConflictDialog } from './ConflictDialog';
import { DevicesDialog } from './DevicesDialog';
import { NameDialog } from './NameDialog';
import { InviteDialog } from './InviteDialog';
import { ActionRow, Group, iconOf } from './settingsRows';
import { SyncAlert } from '../SyncAlert';

type SyncText = TranslationSchema['sync'];
type Failure = SyncFailure | 'undoFirstShort' | 'stale';

/** The detail of Sync now changes this often while the group is open. */
export const LAST_SYNC_TICK_MS = 30_000;
const JUST_NOW_MS = 60_000;

/**
 * The detail of Sync now after a sync. See docs/reference/screens/settings.md#last-sync.
 * `time` is the time of the last sync, and `date` the stored date of an older version.
 */
export const lastSyncText = (
  s: SyncText,
  locale: string,
  time: number | null,
  date: string | null,
  now: number
): string => {
  if (time !== null) {
    if (now - time < JUST_NOW_MS) return s.syncedJustNow;
    const at = new Date(time);
    if (at.toDateString() === new Date(now).toDateString()) {
      return formatMessage(s.lastSyncToday, {
        time: at.toLocaleTimeString(locale, { timeStyle: 'short' }),
      });
    }
    return formatMessage(s.lastSync, {
      date: at.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    });
  }
  if (date === null) return s.notSynced;
  return formatMessage(s.lastSync, {
    date: formatDateDisplay(date, locale, { year: 'numeric', month: 'short', day: 'numeric' }),
  });
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
  /** True for an invitation link, for an installed app on iOS. Else a recovery code. */
  forLink?: boolean;
  /** Recovers with the code and the name of the device. The parent closes the dialog when it worked. */
  onSubmit: (code: string, name: string) => void;
  onCancel: () => void;
  working: boolean;
  error: string | null;
}

/** Asks for the recovery code of a vault. */
export const RecoveryEntryDialog: React.FC<RecoveryEntryDialogProps> = ({
  forLink = false,
  onSubmit,
  onCancel,
  working,
  error,
}) => {
  const { t } = useLanguage();
  const s = t.sync;
  const isCode = !forLink;
  const texts = isCode
    ? { title: s.enterTitle, note: s.enterNote, label: s.codeLabel, action: s.recoverAction }
    : { title: s.linkTitle, note: s.linkNote, label: s.inviteLinkLabel, action: s.joinAction };
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
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
        <h2 id={`${id}-title`}>{texts.title}</h2>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (working) return;
          if (!isCode) {
            onSubmit(code, '');
            return;
          }
          const clean = cleanDeviceName(name);
          if (clean === null) setNameInvalid(true);
          else onSubmit(code, clean);
        }}
        noValidate
      >
        <div className="modal-body password-dialog-body" ref={bodyRef}>
          <p id={`${id}-note`}>{texts.note}</p>
          <div className="form-group">
            <label htmlFor={`${id}-code`}>{texts.label}</label>
            <input
              ref={inputRef}
              id={`${id}-code`}
              className="form-input sync-code-input"
              type="text"
              autoComplete="off"
              autoCapitalize={isCode ? 'characters' : 'off'}
              spellCheck={false}
              value={code}
              onChange={e => setCode(e.target.value)}
            />
          </div>
          {isCode && (
            <DeviceNameField
              value={name}
              onChange={value => {
                setName(value);
                setNameInvalid(false);
              }}
              invalid={nameInvalid}
            />
          )}
          {error && <SyncAlert text={error} />}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={cancel} disabled={working}>
            {t.actions.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={working}>
            {working ? s.working : texts.action}
          </button>
        </div>
      </form>
    </Modal>
  );
};

interface SyncSettingsProps {
  control: SyncControl;
  /** Tells Settings the role of the device record, or null without a record. */
  onRecordChange: (role: DeviceRecord['role'] | null) => void;
  /** Tells Settings when an action starts and ends. Settings does not close while it runs. */
  onBusyChange: (busy: boolean) => void;
}

/** The rows of the sync. While a row runs, all the rows are disabled. */
export const SyncSettings: React.FC<SyncSettingsProps> = ({
  control,
  onRecordChange,
  onBusyChange,
}) => {
  const { lastSyncDate, undoChange } = useCycle();
  const removeDemoDays = useDemoRemoval();
  const [inviting, setInviting] = useState<DeviceRecord['role'] | null>(null);
  const [checking, setChecking] = useState(false);
  const [naming, setNaming] = useState(false);
  const [listing, setListing] = useState(false);
  // The invitation link that the user pasted, for an installed app on iOS
  const [pasting, setPasting] = useState(false);
  const [joinFragment, setJoinFragment] = useState<string | null>(null);
  const { t } = useLanguage();
  const s: SyncText = t.sync;
  const [record, setRecord] = useState<DeviceRecord | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // Sync now runs
  const [syncing, setSyncing] = useState(false);
  // The current time, for the detail of Sync now
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), LAST_SYNC_TICK_MS);
    return () => clearInterval(tick);
  }, []);
  // An action that makes a recovery code runs
  const [making, setMaking] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  // The code of the error of the failure, for the general failure
  const [failureCode, setFailureCode] = useState<string | null>(null);
  const failWith = useCallback((error: unknown, recovering = false) => {
    setFailure(failureOf(error, recovering));
    setFailureCode(failureCodeOf(error));
  }, []);
  // The browser blocks the storage of the record: the group has no row and a note, not an alert
  const [blocked, setBlocked] = useState(false);
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
    onRecordRef.current(next?.role ?? null);
  }, []);

  // The record loads when the group opens
  const { services } = control;
  useEffect(() => {
    void services()
      .then(({ keyStore }) => keyStore.load())
      .then(show, error => {
        if (isStorageBlocked(error)) setBlocked(true);
        else failWith(error);
      });
  }, [services, show, failWith]);

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
      failWith(error, recovering);
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

  /** The record of the key store. Another tab can save one after the group opens. */
  const joined = async (keyStore: SyncServices['keyStore']) => {
    const current = await keyStore.load();
    return current && { record: current };
  };

  const turnOn = (name: string) =>
    run(async ({ relay, keyStore }) => {
      const existing = await joined(keyStore);
      if (existing) return existing;
      removeDemoDays();
      const { createVault } = await import('../../sync/deviceVault');
      const made = await createVault(relay, keyStore, name);
      return { record: made.record, code: made.recoveryCode };
    });

  const recover = (typed: string, name: string) => {
    // ADR 0012: no join while an undo copy exists
    if (undoChange !== null) {
      setFailure('undoFirstShort');
      return;
    }
    return run(
      async ({ relay, keyStore }) => {
        const existing = await joined(keyStore);
        if (existing) return existing;
        removeDemoDays();
        const { recoverWithCode } = await import('../../sync/membership');
        const made = await recoverWithCode(relay, keyStore, typed, name);
        return { record: made.record, code: made.recoveryCode };
      },
      { recovering: true }
    );
  };

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
        removeStorage(STORAGE_SHARED_CHART_KEY);
        removeStorage(STORAGE_SHARED_READ_KEY);
        removeStorage(STORAGE_LAST_SYNC_AT_KEY);
        return { record: null };
      },
      { makesCode: false }
    );
  };

  const syncNow = async () => {
    setBusy(true);
    setSyncing(true);
    setFailure(null);
    await control.syncNow();
    setNow(Date.now());
    setSyncing(false);
    setBusy(false);
  };

  // A reader device stops viewing the shared chart in place of a sync of its own days
  const reading = record?.role === 'reader';
  // A reader device shows the date of its last read of the shared chart
  const syncDate = reading ? readStorage(STORAGE_SHARED_READ_KEY) : lastSyncDate;
  const lastSync = syncing
    ? s.syncing
    : lastSyncText(s, t.locale, control.lastSyncedAt, syncDate, now);
  // The error of the last sync shows only when no action failed
  const lastError = record ? control.lastError : null;
  // The gear warns of an old sync without an error: the group tells why
  const stale = record && isStale(control.lastSyncedAt, now) ? 'stale' : null;
  const shown = failure ?? (lastError ? failureOf(lastError) : stale);
  const shownCode = failure ? failureCode : failureCodeOf(lastError);
  // The code dialog shows its own error
  const alert = entering ? null : shown;
  // An expired sign-in needs a reload. Else, a device with a record can sync again.
  // Try again syncs: it shows only for the alert of a sync, not for the alert of a row
  const alertAction =
    alert === 'signIn'
      ? { label: s.reload, run: () => signInAgain() }
      : record && failure === null
        ? { label: s.tryAgain, run: () => void syncNow() }
        : null;

  return (
    <>
      <Group id="settings-sync" title={s.group}>
        {alert && (
          <li className="settings-alert-row">
            <div role="alert">
              {s[alert]}
              {alert === 'failed' && shownCode && (
                <> {formatMessage(s.errorCode, { code: shownCode })}</>
              )}
            </div>
            {alertAction && (
              <button
                type="button"
                className="btn btn-secondary settings-alert-button"
                onClick={alertAction.run}
                disabled={busy}
              >
                {alertAction.label}
              </button>
            )}
          </li>
        )}
        {record === null && (
          <>
            <ActionRow
              icon={iconOf(Share2)}
              label={s.turnOn}
              detail={s.turnOnHint}
              onClick={() => {
                setFailure(null);
                setNaming(true);
              }}
              disabled={busy}
              opens
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
            <ActionRow
              icon={iconOf(Link)}
              label={s.joinLink}
              detail={s.joinLinkHint}
              onClick={() => setPasting(true)}
              disabled={busy}
              opens
            />
          </>
        )}
        {record && (
          <>
            <ActionRow
              icon={
                <RefreshCw
                  size={18}
                  className={`settings-row-icon${syncing ? ' settings-row-icon-spin' : ''}`}
                  aria-hidden="true"
                />
              }
              label={s.syncNow}
              detail={lastSync}
              onClick={() => void syncNow()}
              disabled={busy}
            />
            {record.role === 'owner' && control.conflicts.length > 0 && (
              <ActionRow
                icon={iconOf(History)}
                label={s.conflicts}
                detail={formatMessage(
                  isSingular(control.conflicts.length, t.locale) ? s.conflictsOne : s.conflictsMany,
                  { count: control.conflicts.length }
                )}
                onClick={() => setChecking(true)}
                disabled={busy}
                opens
              />
            )}
            {record.role === 'owner' && (
              <ActionRow
                icon={iconOf(Users)}
                label={s.devices}
                detail={s.devicesHint}
                onClick={() => setListing(true)}
                disabled={busy}
                opens
              />
            )}
            {record.role === 'owner' && (
              <ActionRow
                icon={iconOf(Smartphone)}
                label={s.invite}
                detail={s.inviteHint}
                onClick={() => setInviting('owner')}
                disabled={busy}
                opens
              />
            )}
            {record.role === 'owner' && (
              <ActionRow
                icon={iconOf(UserPlus)}
                label={s.invitePartner}
                detail={s.invitePartnerHint}
                onClick={() => setInviting('reader')}
                disabled={busy}
                opens
              />
            )}
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
              icon={iconOf(reading ? EyeOff : CloudOff)}
              label={reading ? s.stopViewing : s.turnOff}
              onClick={() => setConfirmOff(true)}
              disabled={busy}
              danger
            />
          </>
        )}
      </Group>
      {blocked && <p className="settings-note">{s.blocked}</p>}

      {entering && (
        <RecoveryEntryDialog
          onSubmit={(typed, name) => void recover(typed, name)}
          onCancel={() => {
            setEntering(false);
            setFailure(null);
          }}
          working={busy}
          error={shown && s[shown]}
        />
      )}

      {pasting && (
        <RecoveryEntryDialog
          forLink
          onSubmit={link => {
            setPasting(false);
            setJoinFragment(link.includes('#') ? link.slice(link.indexOf('#')) : '');
          }}
          onCancel={() => setPasting(false)}
          working={false}
          error={null}
        />
      )}

      {joinFragment !== null && (
        <JoinDialog
          control={control}
          fragment={joinFragment}
          onClose={() => {
            setJoinFragment(null);
            // The join saved a record: the group shows its rows
            void services()
              .then(({ keyStore }) => keyStore.load())
              .then(show);
          }}
        />
      )}

      {naming && (
        <NameDialog
          onSubmit={name => {
            setNaming(false);
            void turnOn(name);
          }}
          onCancel={() => setNaming(false)}
        />
      )}

      {checking && <ConflictDialog control={control} onClose={() => setChecking(false)} />}

      {listing && (
        <DevicesDialog control={control} onCode={setCode} onClose={() => setListing(false)} />
      )}

      {inviting && (
        <InviteDialog control={control} invitedRole={inviting} onClose={() => setInviting(null)} />
      )}

      {code && <RecoveryCodeDialog code={code} onDone={() => setCode(null)} />}

      {confirmOff && (
        <ConfirmDialog
          title={reading ? s.stopViewingTitle : s.turnOffTitle}
          actions={[
            { label: reading ? s.stopViewing : s.turnOffConfirm, onClick: turnOff, danger: true },
          ]}
          onCancel={() => setConfirmOff(false)}
        >
          <p>{reading ? s.stopViewingMessage : s.turnOffMessage}</p>
        </ConfirmDialog>
      )}
    </>
  );
};
