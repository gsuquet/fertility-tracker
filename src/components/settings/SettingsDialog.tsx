import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  Database,
  Download,
  Globe,
  Info,
  Keyboard,
  Lock,
  Moon,
  RefreshCw,
  Scale,
  Smartphone,
  Trash2,
  Upload,
  Vibrate,
  X,
} from 'lucide-react';
import { useCycle } from '../../context/CycleContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { getAppVersion } from '../../domain/appVersion';
import { summarizeObservations } from '../../domain/backupImport';
import { decryptBackup, encryptBackup, parseEncryptedBackup } from '../../domain/encryptedBackup';
import type { EncryptedBackup } from '../../domain/encryptedBackup';
import type { BackupSummary, ImportMode } from '../../domain/backupImport';
import { parseObservationData } from '../../domain/storageFormat';
import { applyUpdate, checkForUpdate, useUpdateReady } from '../../pwa/registerServiceWorker';
import type { UpdateCheckResult } from '../../pwa/registerServiceWorker';
import { useBackUpNow } from '../../hooks/useBackUpNow';
import { setShortcutsEnabled, useShortcutsEnabled } from '../../hooks/useKeyboardShortcuts';
import { formatMessage } from '../../i18n';
import type { SupportedLanguage } from '../../i18n/types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { downloadBackupFile } from '../../utils/exportUtils';
import { isHapticsSupported, setHapticsEnabled, useHapticsEnabled } from '../../utils/haptics';
import { AppBadgeSetting } from '../AppBadgeSetting';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { PasswordDialog } from './PasswordDialog';
import { ActionRow, Group, iconOf } from './settingsRows';
import { SyncSettings } from './SyncSettings';
import type { SyncControl } from '../../hooks/useSync';

interface SettingsDialogProps {
  onClose: () => void;
  /** Installs the app. Not given when the app is installed or the browser cannot install it. */
  onInstall?: (() => void) | undefined;
  onOpenWelcome: () => void;
  onOpenShortcuts: () => void;
  /** Opens the version dialog on its release notes, or at its legal notice */
  onOpenVersion: (tab: 'notes' | 'legal') => void;
  /** Starts with the focus on Restore from a file, for example from Restore a backup of the welcome guide. */
  startWithRestore?: boolean | undefined;
  /** A backup file that the user opened with the app. Settings restores it at once. */
  launchedBackup?: { text: string } | null | undefined;
  /** The sync of the application. Settings shows the Sync group only when it is on. */
  sync?: SyncControl | undefined;
}

/** A data action that waits for the user to confirm it. */
type PendingAction =
  | { kind: 'demo' }
  | { kind: 'clear' }
  | { kind: 'import'; text: string; summary: BackupSummary };

/** The names of the languages, each in its own language */
const LANGUAGE_NAMES: Record<SupportedLanguage, string> = { en: 'English', fr: 'Français' };

interface SwitchRowProps {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}

const SwitchRow: React.FC<SwitchRowProps> = ({ icon, label, checked, onChange }) => (
  <li>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="settings-row"
      onClick={() => onChange(!checked)}
    >
      {icon}
      <span className="settings-row-text">
        <span className="settings-row-label">{label}</span>
      </span>
      <span className="obs-switch" aria-hidden="true" />
    </button>
  </li>
);

/**
 * Settings: all the actions that are not a part of the daily work (RFC 0002). It is a full page on
 * a phone and a 560 pixel dialog on a wider screen. Back, Escape and the close button close it.
 */
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  onClose,
  onInstall,
  onOpenWelcome,
  onOpenShortcuts,
  onOpenVersion,
  startWithRestore = false,
  launchedBackup = null,
  sync,
}) => {
  const {
    observations,
    lastBackupDate,
    importDataJson,
    loadDemoData,
    clearAllData,
    exportDataJson,
    markBackedUp,
  } = useCycle();
  const handleBackUp = useBackUpNow();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const hapticsOn = useHapticsEnabled();
  const shortcutsOn = useShortcutsEnabled();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [importError, setImportError] = useState(false);
  // A device in a vault does not load the demo cycles (ADR 0012)
  const [hasSyncRecord, setHasSyncRecord] = useState(false);
  // A sync action makes a recovery code that the user must see: Settings stays open
  const [syncBusy, setSyncBusy] = useState(false);
  const close = () => {
    if (!syncBusy) onClose();
  };
  const [passwordRequest, setPasswordRequest] = useState<
    { mode: 'backup' } | { mode: 'restore'; backup: EncryptedBackup } | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  // Read once: a later change must not open the dialog again
  const [focusRestore] = useState(startWithRestore);
  const s = t.settings;
  const updateReady = useUpdateReady();
  const [updateCheck, setUpdateCheck] = useState<
    Exclude<UpdateCheckResult, 'ready'> | 'checking' | null
  >(null);

  const hasData = observations.length > 0;

  // Without data there is nothing to lose, so the action runs at once.
  const runOrConfirm = (action: PendingAction) => {
    if (hasData) {
      setPending(action);
    } else {
      runAction(action);
    }
  };

  const runAction = (action: PendingAction, mode: ImportMode = 'replace') => {
    if (action.kind === 'demo') loadDemoData();
    if (action.kind === 'clear') clearAllData();
    if (action.kind === 'import') importDataJson(action.text, mode);
    setPending(null);
    close();
  };

  // The contents decide, not the extension: a .ftbackup file and an old .json file both work
  const restoreText = (text: string) => {
    const encrypted = parseEncryptedBackup(text);
    if (encrypted) {
      setImportError(false);
      setPasswordRequest({ mode: 'restore', backup: encrypted });
      return;
    }
    const imported = parseObservationData(text);
    setImportError(imported === null);
    if (imported) {
      runOrConfirm({ kind: 'import', text, summary: summarizeObservations(imported.observations) });
    }
  };
  const restoreTextRef = useRef(restoreText);
  restoreTextRef.current = restoreText;

  // A file opened with the app goes through the same preview and confirmation
  useEffect(() => {
    if (launchedBackup) restoreTextRef.current(launchedBackup.text);
  }, [launchedBackup]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    e.target.value = '';
    restoreText(text);
  };

  // Each close of the password dialog, or of Settings, makes the running work out of date
  const passwordRunRef = useRef(0);
  useEffect(
    () => () => {
      passwordRunRef.current += 1;
    },
    []
  );
  const closePassword = () => {
    passwordRunRef.current += 1;
    setPasswordRequest(null);
  };

  // The dialog closes on success. False keeps it open with its error message. After a cancel,
  // the result of the work is dropped: no download, no preview.
  const submitPassword = async (password: string): Promise<boolean> => {
    const run = passwordRunRef.current;
    if (passwordRequest?.mode === 'restore') {
      const plain = await decryptBackup(passwordRequest.backup, password);
      if (run !== passwordRunRef.current) return true;
      if (plain === null) return false;
      setPasswordRequest(null);
      restoreText(plain);
      return true;
    }
    let file: string;
    try {
      file = await encryptBackup(exportDataJson(), password);
    } catch {
      return run !== passwordRunRef.current;
    }
    if (run !== passwordRunRef.current) return true;
    downloadBackupFile(file, true);
    markBackedUp();
    setPasswordRequest(null);
    return true;
  };

  const confirmContent = (action: PendingAction) => {
    const count = String(observations.length);
    const c = t.confirmDialog;
    if (action.kind === 'demo') {
      return {
        title: c.demoTitle,
        messages: [formatMessage(c.demoMessage, { count })],
        actions: [{ label: c.demoConfirm, onClick: () => runAction(action) }],
      };
    }
    if (action.kind === 'clear') {
      return {
        title: c.clearTitle,
        messages: [formatMessage(c.clearMessage, { count })],
        actions: [{ label: c.clearConfirm, onClick: () => runAction(action), danger: true }],
      };
    }
    const { summary } = action;
    const fileMessage =
      summary.count === 0
        ? c.importEmpty
        : formatMessage(c.importSummary, {
            count: summary.count,
            first: String(summary.firstDate),
            last: String(summary.lastDate),
          });
    return {
      title: c.importTitle,
      messages: [fileMessage, formatMessage(c.importChoice, { count })],
      actions: [
        { label: c.importMerge, onClick: () => runAction(action, 'merge') },
        { label: c.importReplace, onClick: () => runAction(action, 'replace'), danger: true },
      ],
    };
  };

  // A ready update comes first: the check found it, or it was ready before
  const handleUpdateRow = () => {
    if (updateReady) {
      applyUpdate();
      return;
    }
    if (updateCheck === 'checking') return;
    setUpdateCheck('checking');
    // useUpdateReady() alone shows a ready version, so the row does not keep an old result
    void checkForUpdate().then(result => setUpdateCheck(result === 'ready' ? null : result));
  };
  const updateDetails: Record<Exclude<UpdateCheckResult, 'ready'> | 'checking', string> = {
    checking: s.updateChecking,
    latest: s.updateLatest,
    failed: s.updateFailed,
    unavailable: s.updateUnavailable,
  };
  const updateDetail = updateReady
    ? s.updateReady
    : updateCheck === null
      ? undefined
      : updateDetails[updateCheck];

  const confirmation = pending && confirmContent(pending);
  const lastBackup =
    lastBackupDate === null
      ? s.noBackup
      : formatMessage(s.lastBackup, {
          date: formatDateDisplay(lastBackupDate, t.locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
        });

  return (
    <Modal
      labelledBy="settings-title"
      onClose={close}
      className="modal-overlay settings-overlay"
      panelClassName="modal-container settings-dialog"
      {...(focusRestore ? { initialFocusRef: restoreButtonRef } : {})}
    >
      <div className="modal-header settings-header">
        <button
          type="button"
          className="icon-button settings-close"
          onClick={close}
          disabled={syncBusy}
        >
          <span className="sr-only">{s.close}</span>
          <ChevronLeft size={22} className="settings-close-back" aria-hidden="true" />
          <X size={20} className="settings-close-x" aria-hidden="true" />
        </button>
        <h2 id="settings-title">{s.title}</h2>
      </div>

      <div className="modal-body settings-body">
        {onInstall && (
          <div className="settings-install">
            <Smartphone size={20} className="settings-row-icon" aria-hidden="true" />
            <span className="settings-row-text">
              <span className="settings-row-label">{t.install.menuEntry}</span>
              <span className="settings-row-detail">{t.install.menuHint}</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onInstall}>
              {s.install}
            </button>
          </div>
        )}

        <Group id="settings-appearance" title={s.appearance}>
          <li>
            <label className="settings-row">
              {iconOf(Globe)}
              <span className="settings-row-text">
                <span className="settings-row-label">{s.language}</span>
              </span>
              <select
                className="settings-select"
                value={language}
                onChange={e => setLanguage(e.target.value as SupportedLanguage)}
              >
                {(Object.keys(LANGUAGE_NAMES) as SupportedLanguage[]).map(code => (
                  <option key={code} value={code} lang={code}>
                    {LANGUAGE_NAMES[code]}
                  </option>
                ))}
              </select>
            </label>
          </li>
          <li>
            <fieldset className="settings-row settings-theme">
              <legend className="sr-only">{s.theme}</legend>
              {iconOf(Moon)}
              <span className="settings-row-text" aria-hidden="true">
                <span className="settings-row-label">{s.theme}</span>
              </span>
              <span className="settings-segmented">
                {(['light', 'dark'] as const).map(value => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="settings-theme"
                      value={value}
                      checked={theme === value}
                      onChange={toggleTheme}
                    />
                    <span>{value === 'light' ? s.themeLight : s.themeDark}</span>
                  </label>
                ))}
              </span>
            </fieldset>
          </li>
          {/* Only a browser with the Vibration API can vibrate: Safari on iOS cannot */}
          {isHapticsSupported() && (
            <SwitchRow
              icon={iconOf(Vibrate)}
              label={s.vibration}
              checked={hapticsOn}
              onChange={setHapticsEnabled}
            />
          )}
          <AppBadgeSetting />
          <SwitchRow
            icon={iconOf(Keyboard)}
            label={t.shortcuts.enable}
            checked={shortcutsOn}
            onChange={setShortcutsEnabled}
          />
        </Group>

        <Group id="settings-backup" title={s.backup}>
          <ActionRow
            icon={iconOf(Download)}
            label={s.backUpNow}
            detail={lastBackup}
            onClick={handleBackUp}
          />
          <ActionRow
            icon={iconOf(Lock)}
            label={s.backUpEncrypted}
            onClick={() => setPasswordRequest({ mode: 'backup' })}
            opens
          />
          <ActionRow
            icon={iconOf(Upload)}
            label={s.restore}
            onClick={() => fileInputRef.current?.click()}
            buttonRef={restoreButtonRef}
          />
        </Group>
        {/* No accept filter: iOS greys out a file with an extension that it does not know */}
        <input ref={fileInputRef} type="file" onChange={handleFileUpload} hidden />
        <p className="settings-note">{t.exportModal.jsonDescription}</p>
        {importError && (
          <p className="settings-alert" role="alert">
            {t.exportModal.importError}
          </p>
        )}

        {sync?.enabled && (
          <SyncSettings
            control={sync}
            onRecordChange={setHasSyncRecord}
            onBusyChange={setSyncBusy}
          />
        )}

        <Group id="settings-help" title={s.help}>
          <ActionRow icon={iconOf(BookOpen)} label={s.welcomeGuide} onClick={onOpenWelcome} opens />
          <ActionRow
            icon={iconOf(Keyboard)}
            label={t.shortcuts.title}
            onClick={onOpenShortcuts}
            opens
          />
        </Group>

        <Group id="settings-about" title={s.about}>
          <ActionRow
            icon={iconOf(Info)}
            label={s.aboutApp}
            detail={s.aboutHint}
            value={`v${getAppVersion()}`}
            onClick={() => onOpenVersion('notes')}
            opens
          />
          <ActionRow
            icon={iconOf(Scale)}
            label={s.legal}
            onClick={() => onOpenVersion('legal')}
            opens
          />
          <ActionRow
            icon={iconOf(RefreshCw)}
            label={updateReady ? s.reloadToUpdate : s.checkUpdates}
            {...(updateDetail ? { detail: updateDetail } : {})}
            onClick={handleUpdateRow}
          />
        </Group>
        {/* The detail of the row is its description. This text reads the result aloud */}
        <p className="sr-only" role="status">
          {updateDetail}
        </p>

        <Group id="settings-data" title={s.data}>
          {/* While a sync action runs, the device can join a vault */}
          {!hasSyncRecord && !syncBusy && (
            <ActionRow
              icon={iconOf(Database)}
              label={s.loadDemo}
              onClick={() => runOrConfirm({ kind: 'demo' })}
            />
          )}
          <ActionRow
            icon={iconOf(Trash2)}
            label={s.deleteAll}
            onClick={() => setPending({ kind: 'clear' })}
            disabled={!hasData}
            danger
          />
        </Group>
      </div>

      {passwordRequest && (
        <PasswordDialog
          mode={passwordRequest.mode}
          onSubmit={submitPassword}
          onCancel={closePassword}
        />
      )}

      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          actions={confirmation.actions}
          onCancel={() => setPending(null)}
        >
          {confirmation.messages.map(message => (
            <p key={message}>{message}</p>
          ))}
        </ConfirmDialog>
      )}
    </Modal>
  );
};
