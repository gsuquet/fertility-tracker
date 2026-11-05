import { useMemo, useState } from 'react';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { SettingsDialog } from '../SettingsDialog';
import { useCycleData } from '../../../context/CycleContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { renderWithProviders } from '../../../test/render';
import { makeObservation } from '../../../test/factories';
import { buildDemoObservations } from '../../../domain/demoData';
import {
  decryptBackup,
  encryptBackup,
  parseEncryptedBackup,
} from '../../../domain/encryptedBackup';
import { getAppVersion } from '../../../domain/appVersion';
import { en, fr } from '../../../i18n';
import type { Observation } from '../../../types/crms';
import { getTodayStr } from '../../../utils/dateUtils';
import { STORAGE_LAST_BACKUP_KEY } from '../../../utils/storageKeys';
import { setShortcutsEnabled } from '../../../hooks/useKeyboardShortcuts';
import { setHapticsEnabled } from '../../../utils/haptics';
import type { UpdateCheckResult } from '../../../pwa/registerServiceWorker';
import type { SyncControl, SyncServices } from '../../../hooks/useSync';
import { createVault } from '../../../sync/deviceVault';
import * as syncRunner from '../../../sync/syncRunner';
import { createMemoryKeyStore, createRelayHarness } from '../../../test/relayHarness';

const update = vi.hoisted(() => ({
  ready: false,
  applyUpdate: vi.fn(),
  checkForUpdate: vi.fn<() => Promise<UpdateCheckResult>>(),
}));

vi.mock('../../../pwa/registerServiceWorker', () => ({
  useUpdateReady: () => update.ready,
  applyUpdate: update.applyUpdate,
  checkForUpdate: update.checkForUpdate,
}));

// Three short cycles: 2026-09-01, 2026-09-06, 2026-09-11
const threeCycles = ['2026-09-01', '2026-09-06', '2026-09-11'].flatMap(start => {
  const day = Number(start.slice(8));
  return [
    makeObservation({ date: start, bleeding: 'H' }),
    makeObservation({ date: `2026-09-${String(day + 1).padStart(2, '0')}`, stretch: '0' }),
  ];
});

const State = () => {
  const { observations } = useCycleData();
  const { language } = useLanguage();
  const { theme } = useTheme();
  return (
    <span data-testid="state">
      {observations.length} {language} {theme}
    </span>
  );
};
const count = () => screen.getByTestId('state').textContent?.split(' ')[0];

const makeProps = () => ({
  onClose: vi.fn(),
  onOpenWelcome: vi.fn(),
  onOpenShortcuts: vi.fn(),
  onOpenVersion: vi.fn(),
});

const renderSettings = (
  observations?: Observation[],
  extra: Partial<React.ComponentProps<typeof SettingsDialog>> = {},
  language: 'en' | 'fr' = 'en'
) => {
  const props = { ...makeProps(), ...extra };
  renderWithProviders(
    <>
      <SettingsDialog {...props} />
      <State />
    </>,
    { language, ...(observations ? { observations } : {}) }
  );
  return props;
};

/** The app gives a new object for each file that the user opens with it. */
const Launcher = ({ onClose }: { onClose: () => void }) => {
  const [text, setText] = useState('{}');
  const launchedBackup = useMemo(() => ({ text }), [text]);
  return (
    <>
      <SettingsDialog {...makeProps()} onClose={onClose} launchedBackup={launchedBackup} />
      <button type="button" onClick={() => setText(JSON.stringify(threeCycles.slice(0, 2)))}>
        open another file
      </button>
    </>
  );
};

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const upload = (files: File[]) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
};
const confirmDialog = () => screen.getByRole('dialog', { name: /\?$/ });
const withinConfirm = (name: string) => within(confirmDialog()).getByRole('button', { name });

describe('SettingsDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setShortcutsEnabled(true);
    setHapticsEnabled(true);
  });

  it('is a native modal dialog named Settings, with the groups of RFC 0002 in order', () => {
    renderSettings();
    const dialog = screen.getByRole('dialog', { name: en.settings.title });
    expect(dialog.tagName).toBe('DIALOG');
    const groups = within(dialog)
      .getAllByRole('region')
      .map(group => group.getAttribute('aria-labelledby'));
    expect(groups).toEqual([
      'settings-appearance',
      'settings-backup',
      'settings-help',
      'settings-about',
      'settings-data',
    ]);
    expect(
      within(dialog)
        .getAllByRole('heading', { level: 3 })
        .map(h => h.textContent)
    ).toEqual([
      en.settings.appearance,
      en.settings.backup,
      en.settings.help,
      en.settings.about,
      en.settings.data,
    ]);
    // Delete all data is the last control
    const buttons = within(dialog).getAllByRole('button');
    expect(buttons.at(-1)).toHaveAccessibleName(en.settings.deleteAll);
  });

  it('closes from the close button, Escape and the backdrop', () => {
    const props = renderSettings();
    const dialog = screen.getByRole('dialog', { name: en.settings.title });
    click(en.settings.close);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    fireEvent.click(dialog);
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });

  it('shows Install app only when the browser can install the app', () => {
    const onInstall = vi.fn();
    renderSettings(undefined, { onInstall });
    expect(screen.getByText(en.install.menuEntry)).toBeInTheDocument();
    click(en.settings.install);
    expect(onInstall).toHaveBeenCalledOnce();
  });

  it('has no Install row when the browser cannot install', () => {
    renderSettings();
    expect(screen.queryByText(en.install.menuEntry)).toBeNull();
  });

  it('changes the language with a list of the language names', () => {
    renderSettings();
    const select = screen.getByRole('combobox', { name: en.settings.language });
    expect(
      within(select)
        .getAllByRole('option')
        .map(o => o.textContent)
    ).toEqual(['English', 'Français']);
    fireEvent.change(select, { target: { value: 'fr' } });
    expect(screen.getByTestId('state')).toHaveTextContent('fr');
    expect(screen.getByRole('dialog', { name: fr.settings.title })).toBeInTheDocument();
  });

  it('changes the theme with two radio buttons', () => {
    renderSettings();
    const group = screen.getByRole('group', { name: en.settings.theme });
    const light = within(group).getByRole('radio', { name: en.settings.themeLight });
    const dark = within(group).getByRole('radio', { name: en.settings.themeDark });
    expect(light).toBeChecked();
    fireEvent.click(dark);
    expect(dark).toBeChecked();
    expect(screen.getByTestId('state')).toHaveTextContent('dark');
    fireEvent.click(light);
    expect(screen.getByTestId('state')).toHaveTextContent('light');
  });

  it('turns the vibration and the keyboard shortcuts on and off with switches', () => {
    Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), configurable: true });
    try {
      renderSettings();
      const vibration = screen.getByRole('switch', { name: en.settings.vibration });
      expect(vibration).toHaveAttribute('aria-checked', 'true');
      fireEvent.click(vibration);
      expect(vibration).toHaveAttribute('aria-checked', 'false');
    } finally {
      Reflect.deleteProperty(navigator, 'vibrate');
    }

    const shortcuts = screen.getByRole('switch', { name: en.shortcuts.enable });
    expect(shortcuts).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(shortcuts);
    expect(shortcuts).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(shortcuts);
    expect(shortcuts).toHaveAttribute('aria-checked', 'true');
  });

  it('has no Vibration row without the Vibration API, as in Safari on iOS', () => {
    renderSettings();
    expect(screen.queryByRole('switch', { name: en.settings.vibration })).toBeNull();
  });

  it('opens the help and the about dialogs', () => {
    const props = renderSettings();
    click(en.settings.welcomeGuide);
    expect(props.onOpenWelcome).toHaveBeenCalledOnce();
    click(en.shortcuts.title);
    expect(props.onOpenShortcuts).toHaveBeenCalledOnce();
    const about = screen.getByRole('button', { name: en.settings.aboutApp });
    expect(about).toHaveTextContent(`v${getAppVersion()}`);
    fireEvent.click(about);
    expect(props.onOpenVersion).toHaveBeenCalledWith('notes');
    click(en.settings.legal);
    expect(props.onOpenVersion).toHaveBeenLastCalledWith('legal');
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('shows the date of the last backup, or that there is none', () => {
    localStorage.setItem(STORAGE_LAST_BACKUP_KEY, '2026-10-20');
    renderSettings();
    expect(screen.getByRole('button', { name: en.settings.backUpNow })).toHaveAccessibleDescription(
      'Last backup: Oct 20, 2026'
    );
  });

  it('says that there is no backup yet', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: en.settings.backUpNow })).toHaveTextContent(
      en.settings.noBackup
    );
    expect(screen.getByText(en.exportModal.jsonDescription)).toBeInTheDocument();
  });

  it('downloads the data as a .ftbackup file of plain JSON, and stays open', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:backup');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    let link: HTMLAnchorElement | undefined;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      link = this;
    });
    const props = renderSettings(threeCycles);
    fireEvent.click(screen.getByRole('button', { name: en.settings.backUpNow }));
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(link?.download).toBe(`fertility-tracker-backup-${getTodayStr()}.ftbackup`);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    // With application/json, a browser can add .json after .ftbackup
    expect(blob.type).toBe('application/octet-stream');
    expect(JSON.parse(await blob.text())).toHaveLength(6);
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup'), {
      timeout: 2000,
    });
    expect(localStorage.getItem(STORAGE_LAST_BACKUP_KEY)).toBe(getTodayStr());
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(en.settings.noBackup)).toBeNull();
  });

  it('downloads an encrypted .ftbackup file with Back up with a password, and stays open', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:backup');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    let link: HTMLAnchorElement | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      link = this;
    });
    const props = renderSettings(threeCycles);
    click(en.settings.backUpEncrypted);
    const dialog = screen.getByRole('dialog', { name: en.passwordDialog.backupTitle });
    const password = 'a long enough password';
    for (const label of [en.passwordDialog.password, en.passwordDialog.confirm]) {
      fireEvent.change(within(dialog).getByLabelText(label), { target: { value: password } });
    }
    fireEvent.click(within(dialog).getByRole('button', { name: en.passwordDialog.save }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: en.passwordDialog.backupTitle })).toBeNull()
    );
    expect(link?.download).toBe(`fertility-tracker-backup-${getTodayStr()}-encrypted.ftbackup`);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const text = await blob.text();
    expect(text).not.toContain('2026-09-01');
    const plain = await decryptBackup(parseEncryptedBackup(text)!, password);
    expect(JSON.parse(plain!)).toHaveLength(6);
    expect(localStorage.getItem(STORAGE_LAST_BACKUP_KEY)).toBe(getTodayStr());
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('keeps the password dialog open with a message when the encryption fails', async () => {
    vi.spyOn(crypto.subtle, 'deriveKey').mockRejectedValueOnce(new Error('no PBKDF2'));
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    renderSettings(threeCycles);
    click(en.settings.backUpEncrypted);
    const dialog = screen.getByRole('dialog', { name: en.passwordDialog.backupTitle });
    for (const label of [en.passwordDialog.password, en.passwordDialog.confirm]) {
      fireEvent.change(within(dialog).getByLabelText(label), {
        target: { value: 'twelve chars ok' },
      });
    }
    fireEvent.click(within(dialog).getByRole('button', { name: en.passwordDialog.save }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(en.passwordDialog.failed);
    expect(download).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_LAST_BACKUP_KEY)).toBeNull();
  });

  it('asks for the password of an encrypted file, then restores it after the preview', async () => {
    const file = await encryptBackup(JSON.stringify(threeCycles.slice(0, 2)), 'the right password');
    const props = renderSettings(threeCycles);
    upload([new File([file], 'backup-encrypted.ftbackup')]);
    const dialog = await screen.findByRole('dialog', { name: en.passwordDialog.restoreTitle });
    const field = within(dialog).getByLabelText(en.passwordDialog.password);

    fireEvent.change(field, { target: { value: 'a wrong password' } });
    fireEvent.click(within(dialog).getByRole('button', { name: en.passwordDialog.open }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      en.passwordDialog.wrongPassword
    );
    expect(count()).toBe('6');

    fireEvent.change(field, { target: { value: 'the right password' } });
    fireEvent.click(within(dialog).getByRole('button', { name: en.passwordDialog.open }));
    const preview = await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(screen.queryByRole('dialog', { name: en.passwordDialog.restoreTitle })).toBeNull();
    fireEvent.click(within(preview).getByRole('button', { name: en.confirmDialog.importReplace }));
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(count()).toBe('2');
  });

  it('drops the result of the work when the user cancels while it runs', async () => {
    const encrypt = vi.spyOn(crypto.subtle, 'encrypt');
    const decrypt = vi.spyOn(crypto.subtle, 'decrypt');
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const props = renderSettings(threeCycles);

    click(en.settings.backUpEncrypted);
    let dialog = screen.getByRole('dialog', { name: en.passwordDialog.backupTitle });
    for (const label of [en.passwordDialog.password, en.passwordDialog.confirm]) {
      fireEvent.change(within(dialog).getByLabelText(label), {
        target: { value: 'twelve chars ok' },
      });
    }
    fireEvent.click(within(dialog).getByRole('button', { name: en.passwordDialog.save }));
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    await waitFor(() => expect(encrypt).toHaveBeenCalledOnce());
    await encrypt.mock.results[0]?.value;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(download).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_LAST_BACKUP_KEY)).toBeNull();

    const file = await encryptBackup(JSON.stringify(threeCycles.slice(0, 2)), 'the right password');
    upload([new File([file], 'backup-encrypted.ftbackup')]);
    dialog = await screen.findByRole('dialog', { name: en.passwordDialog.restoreTitle });
    fireEvent.change(within(dialog).getByLabelText(en.passwordDialog.password), {
      target: { value: 'the right password' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: en.passwordDialog.open }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(decrypt).toHaveBeenCalledOnce());
    await decrypt.mock.results[0]?.value;
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.queryByRole('dialog', { name: en.confirmDialog.importTitle })).toBeNull();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(count()).toBe('6');
  });

  it('drops a failed encryption after a cancel, and keeps Settings open', async () => {
    let fail: (error: Error) => void = () => {};
    vi.spyOn(crypto.subtle, 'deriveKey').mockReturnValueOnce(
      new Promise<CryptoKey>((_resolve, reject) => (fail = reject))
    );
    renderSettings(threeCycles);
    click(en.settings.backUpEncrypted);
    const dialog = screen.getByRole('dialog', { name: en.passwordDialog.backupTitle });
    for (const label of [en.passwordDialog.password, en.passwordDialog.confirm]) {
      fireEvent.change(within(dialog).getByLabelText(label), {
        target: { value: 'twelve chars ok' },
      });
    }
    fireEvent.click(within(dialog).getByRole('button', { name: en.passwordDialog.save }));
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    fail(new Error('no PBKDF2'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByRole('dialog', { name: en.passwordDialog.backupTitle })).toBeNull();
    expect(screen.getByRole('dialog', { name: en.settings.title })).toBeInTheDocument();
  });

  it('closes the password dialog with Cancel and keeps Settings and the data', async () => {
    const file = await encryptBackup('[]', 'the right password');
    const props = renderSettings(threeCycles);
    upload([new File([file], 'backup-encrypted.ftbackup')]);
    const dialog = await screen.findByRole('dialog', { name: en.passwordDialog.restoreTitle });
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    expect(screen.queryByRole('dialog', { name: en.passwordDialog.restoreTitle })).toBeNull();
    expect(screen.getByRole('dialog', { name: en.settings.title })).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(count()).toBe('6');
  });

  it('accepts any file in the file picker, so iOS does not grey out a .ftbackup file', () => {
    renderSettings();
    expect(document.querySelector('input[type="file"]')).not.toHaveAttribute('accept');
  });

  it('opens the hidden file input from Restore from a file', () => {
    renderSettings();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    click(en.settings.restore);
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('starts with the focus on Restore from a file when asked', () => {
    renderSettings(undefined, { startWithRestore: true });
    expect(screen.getByRole('button', { name: en.settings.restore })).toHaveFocus();
  });

  it('restores a .ftbackup file and an old .json file, and checks the contents of both', async () => {
    const props = renderSettings();
    upload([new File(['not json'], 'notes.ftbackup')]);
    expect(await screen.findByRole('alert')).toHaveTextContent(en.exportModal.importError);
    upload([new File([JSON.stringify(threeCycles)], 'fertility-tracker-backup.ftbackup')]);
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(count()).toBe('6');
  });

  it('restores a backup file that the user opened with the app, after the same preview', async () => {
    const onClose = vi.fn();
    renderWithProviders(<Launcher onClose={onClose} />, { observations: threeCycles });
    expect(await screen.findByRole('alert')).toHaveTextContent(en.exportModal.importError);
    click('open another file');
    const dialog = await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: en.confirmDialog.importReplace }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('restores a backup in the versioned envelope', async () => {
    const props = renderSettings();
    const envelope = JSON.stringify({ schemaVersion: 1, observations: threeCycles });
    upload([new File([envelope], 'backup.json')]);
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(count()).toBe('6');
  });

  it('asks before a backup replaces existing data', async () => {
    const props = renderSettings(threeCycles);
    upload([new File([JSON.stringify(threeCycles.slice(0, 2))], 'backup.json')]);
    await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(count()).toBe('6');
    fireEvent.click(withinConfirm(en.actions.cancel));
    expect(screen.queryByRole('dialog', { name: en.confirmDialog.importTitle })).toBeNull();
    expect(props.onClose).not.toHaveBeenCalled();

    upload([new File([JSON.stringify(threeCycles.slice(0, 2))], 'backup.json')]);
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: en.confirmDialog.importTitle })).getByRole(
        'button',
        { name: en.confirmDialog.importReplace }
      )
    );
    expect(count()).toBe('2');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('previews the file and merges it into the existing data', async () => {
    const props = renderSettings(threeCycles);
    const file = [
      makeObservation({ date: '2026-09-12', stretch: '10', modifiers: ['K'] }),
      makeObservation({ date: '2026-09-20', stretch: '0' }),
    ];
    upload([new File([JSON.stringify(file)], 'backup.json')]);
    const dialog = await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(dialog).toHaveTextContent(
      en.confirmDialog.importSummary
        .replace('{count}', '2')
        .replace('{first}', '2026-09-12')
        .replace('{last}', '2026-09-20')
    );
    expect(dialog).toHaveTextContent(en.confirmDialog.importChoice.replace('{count}', '6'));
    fireEvent.click(within(dialog).getByRole('button', { name: en.confirmDialog.importMerge }));
    // The file replaces 2026-09-12 and adds 2026-09-20: 6 + 1 observations
    expect(count()).toBe('7');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('previews a file with no observations, in French', async () => {
    renderSettings(threeCycles, {}, 'fr');
    upload([new File(['[]'], 'empty.json')]);
    const dialog = await screen.findByRole('dialog', { name: fr.confirmDialog.importTitle });
    expect(dialog).toHaveTextContent(fr.confirmDialog.importEmpty);
    expect(
      within(dialog).getByRole('button', { name: fr.confirmDialog.importMerge })
    ).toBeVisible();
  });

  it('shows a translated error for an invalid backup and ignores an empty selection', async () => {
    const alertSpy = vi.spyOn(window, 'alert');
    const props = renderSettings(threeCycles);
    upload([]);
    upload([new File(['not json'], 'broken.json')]);
    expect(await screen.findByRole('alert')).toHaveTextContent(en.exportModal.importError);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(count()).toBe('6');
    expect(props.onClose).not.toHaveBeenCalled();

    upload([new File([JSON.stringify(threeCycles)], 'backup.json')]);
    await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the import error in French', async () => {
    renderSettings(undefined, {}, 'fr');
    upload([new File(['{}'], 'broken.json')]);
    expect(await screen.findByRole('alert')).toHaveTextContent(fr.exportModal.importError);
  });

  it('loads the demo data at once when there is no data', () => {
    const props = renderSettings();
    click(en.settings.loadDemo);
    expect(count()).toBe(String(buildDemoObservations('2026-09-30').length));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('asks before the demo data replaces existing data', () => {
    const props = renderSettings(threeCycles);
    click(en.settings.loadDemo);
    expect(confirmDialog()).toHaveAccessibleName(en.confirmDialog.demoTitle);
    expect(confirmDialog()).toHaveAccessibleDescription(
      en.confirmDialog.demoMessage.replace('{count}', '6')
    );
    fireEvent.click(withinConfirm(en.actions.cancel));
    expect(count()).toBe('6');

    click(en.settings.loadDemo);
    fireEvent.click(withinConfirm(en.confirmDialog.demoConfirm));
    expect(count()).toBe(String(buildDemoObservations('2026-09-30').length));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('deletes all the data only after confirmation in the app dialog', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const props = renderSettings(threeCycles);
    screen.getByRole('button', { name: en.settings.deleteAll }).focus();
    click(en.settings.deleteAll);
    expect(confirmDialog()).toHaveAccessibleName(en.confirmDialog.clearTitle);
    // The message tells that a copy stays and names the toast button that deletes it
    expect(confirmDialog()).toHaveAccessibleDescription(
      en.confirmDialog.clearMessage.replace('{count}', '6')
    );
    expect(en.confirmDialog.clearMessage).toContain(en.undoToast.dismiss);
    fireEvent.keyDown(withinConfirm(en.actions.cancel), { key: 'Escape' });
    expect(count()).toBe('6');
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: en.settings.deleteAll })).toHaveFocus();

    click(en.settings.deleteAll);
    fireEvent.click(withinConfirm(en.confirmDialog.clearConfirm));
    expect(count()).toBe('0');
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('disables Delete all data when there is no data', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: en.settings.deleteAll })).toBeDisabled();
  });

  it('asks in French', () => {
    renderSettings(threeCycles, {}, 'fr');
    click(fr.settings.deleteAll);
    expect(screen.getByRole('dialog', { name: fr.confirmDialog.clearTitle })).toHaveTextContent(
      fr.undoToast.dismiss
    );
    expect(screen.getByRole('button', { name: fr.confirmDialog.clearConfirm })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: fr.settings.data })).toBeInTheDocument();
  });
});

describe('Check for updates', () => {
  beforeEach(() => {
    update.ready = false;
    update.applyUpdate.mockReset();
    update.checkForUpdate.mockReset();
  });

  const row = () => screen.getByRole('button', { name: en.settings.checkUpdates });
  const status = () => screen.getByRole('status');

  it('is the last row of About and shows no result before a check', () => {
    renderSettings();
    const about = screen.getByRole('region', { name: en.settings.about });
    expect(within(about).getAllByRole('button').at(-1)).toBe(row());
    expect(row()).not.toHaveAccessibleDescription();
    expect(status()).toBeEmptyDOMElement();
  });

  it.each([
    ['latest', en.settings.updateLatest],
    ['failed', en.settings.updateFailed],
    ['unavailable', en.settings.updateUnavailable],
  ] as const)('checks at once and says the result %s', async (result, text) => {
    let finish: (value: UpdateCheckResult) => void = () => undefined;
    update.checkForUpdate.mockReturnValue(new Promise(resolve => (finish = resolve)));
    const props = renderSettings();
    fireEvent.click(row());
    expect(row()).toHaveAccessibleDescription(en.settings.updateChecking);
    expect(status()).toHaveTextContent(en.settings.updateChecking);
    // A second tap while the check runs does nothing
    fireEvent.click(row());
    expect(update.checkForUpdate).toHaveBeenCalledOnce();
    finish(result);
    await waitFor(() => expect(row()).toHaveAccessibleDescription(text));
    expect(status()).toHaveTextContent(text);
    expect(update.applyUpdate).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('can check again after a result', async () => {
    update.checkForUpdate.mockResolvedValue('failed');
    renderSettings();
    fireEvent.click(row());
    await waitFor(() => expect(row()).toHaveAccessibleDescription(en.settings.updateFailed));
    fireEvent.click(row());
    expect(update.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('does not keep a ready result: only a version that still waits shows Reload to update', async () => {
    // The check found a version, but a newer one replaced it before the row rendered
    update.checkForUpdate.mockResolvedValue('ready');
    renderSettings();
    fireEvent.click(row());
    await waitFor(() => expect(row()).not.toHaveAccessibleDescription());
    expect(status()).toBeEmptyDOMElement();
    fireEvent.click(row());
    expect(update.checkForUpdate).toHaveBeenCalledTimes(2);
    expect(update.applyUpdate).not.toHaveBeenCalled();
  });

  it('applies a ready update with Reload to update', () => {
    update.ready = true;
    renderSettings();
    const reload = screen.getByRole('button', { name: en.settings.reloadToUpdate });
    expect(reload).toHaveAccessibleDescription(en.settings.updateReady);
    expect(status()).toHaveTextContent(en.settings.updateReady);
    fireEvent.click(reload);
    expect(update.applyUpdate).toHaveBeenCalledOnce();
    expect(update.checkForUpdate).not.toHaveBeenCalled();
  });

  it('is in French', () => {
    update.ready = true;
    renderSettings(undefined, {}, 'fr');
    expect(
      screen.getByRole('button', { name: fr.settings.reloadToUpdate })
    ).toHaveAccessibleDescription(fr.settings.updateReady);
  });
});

describe('SettingsDialog sync', () => {
  const controlOf = async (withRecord: boolean, enabled = true): Promise<SyncControl> => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    if (withRecord) await createVault(harness.relay, keyStore);
    const services: SyncServices = { relay: harness.relay, keyStore, runner: syncRunner };
    return {
      enabled,
      services: async () => services,
      syncNow: vi.fn(),
      withSync: action => action(services),
      lastError: null,
    };
  };
  const groupNames = () =>
    screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);

  it('has no Sync group while the sync is off', async () => {
    renderSettings(undefined, { sync: await controlOf(true, false) });
    expect(groupNames()).not.toContain(en.sync.group);
    expect(screen.getByRole('button', { name: en.settings.loadDemo })).toBeInTheDocument();
  });

  it('shows the Sync group after Backup and restore when the sync is on', async () => {
    renderSettings(undefined, { sync: await controlOf(false) });
    expect(await screen.findByRole('button', { name: en.sync.turnOn })).toBeInTheDocument();
    const names = groupNames();
    expect(names.indexOf(en.sync.group)).toBe(names.indexOf(en.settings.backup) + 1);
    expect(screen.getByRole('button', { name: en.settings.loadDemo })).toBeInTheDocument();
  });

  it('hides Load the demo cycles while the device has a record', async () => {
    renderSettings(undefined, { sync: await controlOf(true) });
    expect(await screen.findByRole('button', { name: en.sync.syncNow })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.settings.loadDemo })).toBeNull();
    expect(screen.getByRole('button', { name: en.settings.deleteAll })).toBeInTheDocument();
  });

  it('stays open while a sync action runs', async () => {
    const harness = createRelayHarness();
    let release: () => void = () => {};
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    const relay = {
      ...harness.relay,
      putVault: async (...args: Parameters<typeof harness.relay.putVault>) => {
        await blocked;
        return harness.relay.putVault(...args);
      },
    };
    const services: SyncServices = { relay, keyStore: createMemoryKeyStore(), runner: syncRunner };
    const props = renderSettings(threeCycles, {
      sync: {
        enabled: true,
        services: async () => services,
        syncNow: vi.fn(async () => {}),
        withSync: action => action(services),
        lastError: null,
      },
    });
    fireEvent.click(await screen.findByRole('button', { name: en.sync.turnOn }));
    const close = screen.getByRole('button', { name: en.settings.close });
    await waitFor(() => expect(close).toBeDisabled());
    fireEvent.keyDown(screen.getByRole('dialog', { name: en.settings.title }), { key: 'Escape' });
    // The device joins a vault: no demo days. A data action does not close Settings.
    expect(screen.queryByRole('button', { name: en.settings.loadDemo })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en.settings.deleteAll }));
    const confirm = screen.getByRole('dialog', { name: en.confirmDialog.clearTitle });
    fireEvent.click(within(confirm).getByRole('button', { name: en.confirmDialog.clearConfirm }));
    expect(count()).toBe('0');
    expect(props.onClose).not.toHaveBeenCalled();
    await act(async () => release());
    expect(await screen.findByRole('dialog', { name: en.sync.codeTitle })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.sync.wroteItDown }));
    expect(close).toBeEnabled();
    fireEvent.click(close);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
