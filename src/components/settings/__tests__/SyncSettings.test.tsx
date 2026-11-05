import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en, fr } from '../../../i18n';
import { formatRecoveryCode, newRecoverySecret } from '../../../domain/vault/recoveryCode';
import type { SyncControl, SyncOutcome, SyncServices } from '../../../hooks/useSync';
import { VaultError, createVault } from '../../../sync/deviceVault';
import type { DeviceRecord, KeyStore } from '../../../sync/keyStore';
import { createRelayClient } from '../../../sync/relayClient';
import type { RelayClient } from '../../../sync/relayClient';
import * as runner from '../../../sync/syncRunner';
import { renderWithProviders } from '../../../test/render';
import { createMemoryKeyStore, createRelayHarness } from '../../../test/relayHarness';
import {
  STORAGE_LAST_SYNC_KEY,
  STORAGE_SHARED_CHART_KEY,
  STORAGE_SHARED_READ_KEY,
  STORAGE_SYNC_CONFLICTS_KEY,
  STORAGE_SYNC_STATE_KEY,
  STORAGE_UNDO_KEY,
} from '../../../utils/storageKeys';
import { SyncSettings } from '../SyncSettings';
import { useSync } from '../../../hooks/useSync';
import { buildDemoObservations } from '../../../domain/demoData';
import { makeObservation } from '../../../test/factories';
import type { Observation } from '../../../types/crms';
import { STORAGE_OBSERVATIONS_KEY } from '../../../utils/storageKeys';

const s = en.sync;
const CODE = /^[0-9A-Z]{4}(-[0-9A-Z]{1,4})+$/;

const controlOf = (
  relay: RelayClient,
  keyStore: KeyStore,
  extra: Partial<SyncControl> = {}
): SyncControl & { syncNow: ReturnType<typeof vi.fn> } => {
  const services: SyncServices = { relay, keyStore, runner };
  return {
    enabled: true,
    services: () => Promise.resolve(services),
    syncNow: vi.fn(async () => {}),
    withSync: action => action(services),
    lastError: null,
    conflicts: [],
    resolveConflict: vi.fn(async () => {}),
    ...extra,
  } as SyncControl & { syncNow: ReturnType<typeof vi.fn> };
};

const renderSync = (
  control: SyncControl,
  language: 'en' | 'fr' = 'en',
  observations?: Observation[]
) => {
  const onRecordChange = vi.fn();
  const onBusyChange = vi.fn();
  const view = renderWithProviders(
    <SyncSettings control={control} onRecordChange={onRecordChange} onBusyChange={onBusyChange} />,
    { language, ...(observations ? { observations } : {}) }
  );
  return { onRecordChange, onBusyChange, ...view };
};

/** Settings with the real sync control of the application. */
const SyncHarness = ({ load }: { load: () => Promise<SyncServices> }) => {
  const control = useSync(true, load);
  return <SyncSettings control={control} onRecordChange={() => {}} onBusyChange={() => {}} />;
};

const row = (name: string) => screen.findByRole('button', { name });
/** Types the name of the device in the name dialog of Turn on sync, and turns on the sync. */
const nameAndTurnOn = async (name = 'Phone') => {
  const dialog = await screen.findByRole('dialog', { name: s.nameTitle });
  fireEvent.change(within(dialog).getByLabelText(s.nameLabel), { target: { value: name } });
  fireEvent.click(within(dialog).getByRole('button', { name: s.turnOn }));
};
/** Types the name of the device in the code dialog. */
const typeRecoveryName = (dialog: HTMLElement, name = 'Laptop') =>
  fireEvent.change(within(dialog).getByLabelText(s.nameLabel), { target: { value: name } });
const codeOf = (dialog: HTMLElement) =>
  within(dialog).getByText(CODE, { selector: '.sync-code' }).textContent as string;

/** A relay that gives the same error to each request. */
const failingRelay = (status: number) =>
  createRelayClient(
    async () => new Response(JSON.stringify({ error: 'x' }), { status }),
    'https://relay.test'
  );

const ownerRecord = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  const made = await createVault(harness.relay, keyStore, 'Phone');
  return { ...harness, keyStore, ...made };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SyncSettings', () => {
  it('turns on the sync and shows the recovery code until the user wrote it down', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    const control = controlOf(harness.relay, keyStore);
    const { onRecordChange } = renderSync(control);

    expect(await row(s.recover)).toHaveAccessibleDescription(s.recoverHint);
    expect(onRecordChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('button', { name: s.syncNow })).toBeNull();
    fireEvent.click(await row(s.turnOn));
    await nameAndTurnOn();

    const dialog = await screen.findByRole('dialog', { name: s.codeTitle });
    expect(dialog).toHaveAccessibleDescription(s.codeNote);
    expect(codeOf(dialog)).toMatch(CODE);
    expect(await keyStore.load()).toMatchObject({ role: 'owner' });
    expect(control.syncNow).toHaveBeenCalledTimes(1);
    expect(onRecordChange).toHaveBeenLastCalledWith('owner');

    // Escape and the backdrop do not close it
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.click(dialog);
    expect(screen.getByRole('dialog', { name: s.codeTitle })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: s.wroteItDown }));
    expect(screen.queryByRole('dialog', { name: s.codeTitle })).toBeNull();

    expect(await row(s.syncNow)).toHaveAccessibleDescription(s.notSynced);
    expect(screen.getByRole('button', { name: s.newCode })).toBeEnabled();
    expect(screen.getByRole('button', { name: s.turnOff })).toBeEnabled();
    expect(screen.queryByRole('button', { name: s.turnOn })).toBeNull();
  });

  it('copies the code to the clipboard', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const harness = createRelayHarness();
    renderSync(controlOf(harness.relay, createMemoryKeyStore()));
    fireEvent.click(await row(s.turnOn));
    await nameAndTurnOn();
    const dialog = await screen.findByRole('dialog', { name: s.codeTitle });
    fireEvent.click(within(dialog).getByRole('button', { name: s.copy }));
    expect(await within(dialog).findByRole('button', { name: s.copied })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(codeOf(dialog));
  });

  it('keeps Copy when the clipboard refuses the code or does not exist', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied');
    });
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const harness = createRelayHarness();
    renderSync(controlOf(harness.relay, createMemoryKeyStore()));
    fireEvent.click(await row(s.turnOn));
    await nameAndTurnOn();
    const dialog = await screen.findByRole('dialog', { name: s.codeTitle });
    fireEvent.click(within(dialog).getByRole('button', { name: s.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(within(dialog).getByRole('button', { name: s.copy })).toBeInTheDocument();

    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    fireEvent.click(within(dialog).getByRole('button', { name: s.copy }));
    expect(within(dialog).getByRole('button', { name: s.copy })).toBeInTheDocument();
  });

  it('gives the cause of a failed turn on', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    harness.failWhen(() => true);
    renderSync(controlOf(harness.relay, keyStore));
    fireEvent.click(await row(s.turnOn));
    await nameAndTurnOn();
    expect(await screen.findByRole('alert')).toHaveTextContent(s.noConnection);
    expect(await keyStore.load()).toBeNull();
    expect(screen.getByRole('button', { name: s.turnOn })).toBeEnabled();
  });

  it('gives sync not available when the relay has no bucket', async () => {
    renderSync(controlOf(failingRelay(503), createMemoryKeyStore()));
    fireEvent.click(await row(s.turnOn));
    await nameAndTurnOn();
    expect(await screen.findByRole('alert')).toHaveTextContent(s.unavailable);
  });

  it('disables the rows while a row runs', async () => {
    let release: () => void = () => {};
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    const harness = createRelayHarness();
    const relay: RelayClient = {
      ...harness.relay,
      putVault: async (...args) => {
        await blocked;
        return harness.relay.putVault(...args);
      },
    };
    renderSync(controlOf(relay, createMemoryKeyStore()));
    const turnOn = await row(s.turnOn);
    fireEvent.click(turnOn);
    await nameAndTurnOn();
    await waitFor(() => expect(turnOn).toBeDisabled());
    expect(screen.getByRole('button', { name: s.recover })).toBeDisabled();
    // A second click does not start a second vault
    fireEvent.click(turnOn);
    await act(async () => release());
    expect(await screen.findByRole('dialog', { name: s.codeTitle })).toBeInTheDocument();
  });

  it('recovers a vault with a code and shows a new code', async () => {
    const owner = await ownerRecord();
    const keyStore = createMemoryKeyStore();
    const control = controlOf(owner.relay, keyStore);
    renderSync(control);
    fireEvent.click(await row(s.recover));
    const dialog = await screen.findByRole('dialog', { name: s.enterTitle });
    expect(dialog).toHaveAccessibleDescription(s.enterNote);
    const input = within(dialog).getByLabelText(s.codeLabel);
    typeRecoveryName(dialog);
    expect(input).toHaveFocus();

    // A code with a wrong character, then a valid code of no vault
    fireEvent.change(input, { target: { value: 'ABCD' } });
    fireEvent.click(within(dialog).getByRole('button', { name: s.recoverAction }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(s.badCode);
    fireEvent.change(input, { target: { value: await formatRecoveryCode(newRecoverySecret()) } });
    fireEvent.submit(input);
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: s.recoverAction })).toBeEnabled()
    );
    expect(within(dialog).getByRole('alert')).toHaveTextContent(s.badCode);
    // The alert of the code dialog does not show also under the group
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    fireEvent.change(input, { target: { value: owner.recoveryCode.toLowerCase() } });
    fireEvent.submit(input);
    const code = await screen.findByRole('dialog', { name: s.codeTitle });
    expect(codeOf(code)).not.toBe(owner.recoveryCode);
    expect(screen.queryByRole('dialog', { name: s.enterTitle })).toBeNull();
    expect((await keyStore.load())?.vaultId).toBe(owner.record.vaultId);
    expect(control.syncNow).toHaveBeenCalledTimes(1);
  });

  it('shows Working while the recovery runs, and Cancel closes the code dialog', async () => {
    let release: () => void = () => {};
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    const owner = await ownerRecord();
    const relay: RelayClient = {
      ...owner.relay,
      getRecovery: async lookupId => {
        await blocked;
        return owner.relay.getRecovery(lookupId);
      },
    };
    renderSync(controlOf(relay, createMemoryKeyStore()));
    fireEvent.click(await row(s.recover));
    const dialog = await screen.findByRole('dialog', { name: s.enterTitle });
    const input = within(dialog).getByLabelText(s.codeLabel);
    typeRecoveryName(dialog);
    fireEvent.change(input, { target: { value: await formatRecoveryCode(newRecoverySecret()) } });
    fireEvent.submit(input);
    const working = await within(dialog).findByRole('button', { name: s.working });
    expect(working).toBeDisabled();
    // The recovery makes a new code: the dialog does not close while it runs
    expect(within(dialog).getByRole('button', { name: en.actions.cancel })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: s.enterTitle })).toBeInTheDocument();
    // A second submit waits for the first one
    fireEvent.submit(input);
    await act(async () => release());
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(s.badCode);
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    expect(screen.queryByRole('dialog', { name: s.enterTitle })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('makes a new recovery code on an owner device', async () => {
    const owner = await ownerRecord();
    const control = controlOf(owner.relay, owner.keyStore);
    renderSync(control);
    expect(await row(s.newCode)).toHaveAccessibleDescription(s.newCodeHint);
    fireEvent.click(screen.getByRole('button', { name: s.newCode }));
    const dialog = await screen.findByRole('dialog', { name: s.codeTitle });
    expect(codeOf(dialog)).not.toBe(owner.recoveryCode);
    expect(control.syncNow).toHaveBeenCalledTimes(1);
  });

  it('opens the invitation dialog on an owner device', async () => {
    const owner = await ownerRecord();
    renderSync(controlOf(owner.relay, owner.keyStore));
    expect(await row(s.invite)).toHaveAccessibleDescription(s.inviteHint);
    fireEvent.click(screen.getByRole('button', { name: s.invite }));
    const dialog = await screen.findByRole('dialog', { name: s.inviteTitle });
    fireEvent.click(await within(dialog).findByRole('button', { name: en.actions.cancel }));
    expect(screen.queryByRole('dialog', { name: s.inviteTitle })).toBeNull();
  });

  it('opens the invitation dialog of a partner on an owner device', async () => {
    const owner = await ownerRecord();
    renderSync(controlOf(owner.relay, owner.keyStore));
    expect(await row(s.invitePartner)).toHaveAccessibleDescription(s.invitePartnerHint);
    fireEvent.click(screen.getByRole('button', { name: s.invitePartner }));
    const dialog = await screen.findByRole('dialog', { name: s.invitePartner });
    expect(await within(dialog).findByRole('textbox', { name: s.inviteLinkLabel })).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    expect(screen.queryByRole('dialog', { name: s.invitePartner })).toBeNull();
  });

  it('joins with a pasted link, for an installed app on iOS', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    const { onRecordChange } = renderSync(controlOf(harness.relay, keyStore));
    expect(await row(s.joinLink)).toHaveAccessibleDescription(s.joinLinkHint);

    // Cancel, then a text without a link
    fireEvent.click(screen.getByRole('button', { name: s.joinLink }));
    let dialog = await screen.findByRole('dialog', { name: s.linkTitle });
    expect(dialog).toHaveAccessibleDescription(s.linkNote);
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    expect(screen.queryByRole('dialog', { name: s.linkTitle })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: s.joinLink }));
    dialog = await screen.findByRole('dialog', { name: s.linkTitle });
    fireEvent.change(within(dialog).getByLabelText(s.inviteLinkLabel), {
      target: { value: 'hello' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: s.joinAction }));
    let join = await screen.findByRole('dialog', { name: s.joinTitle });
    expect(await within(join).findByRole('alert')).toHaveTextContent(s.badLink);
    fireEvent.click(within(join).getByRole('button', { name: s.close }));

    // A link with its fragment: the device joins, then the group shows the rows of the record
    fireEvent.click(await row(s.joinLink));
    dialog = await screen.findByRole('dialog', { name: s.linkTitle });
    fireEvent.change(within(dialog).getByLabelText(s.inviteLinkLabel), {
      target: { value: 'https://app.test/#invite=abc.def' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: s.joinAction }));
    join = await screen.findByRole('dialog', { name: s.joinTitle });
    expect(await within(join).findByRole('alert')).toHaveTextContent(s.badLink);
    const owner = await ownerRecord();
    await keyStore.save(owner.record);
    fireEvent.click(within(join).getByRole('button', { name: s.close }));
    expect(await row(s.syncNow)).toBeInTheDocument();
    expect(onRecordChange).toHaveBeenLastCalledWith('owner');
  });

  it('does not recover while an undo copy exists', async () => {
    const owner = await ownerRecord();
    localStorage.setItem(STORAGE_UNDO_KEY, JSON.stringify([]));
    const keyStore = createMemoryKeyStore();
    renderSync(controlOf(owner.relay, keyStore));
    fireEvent.click(await row(s.recover));
    const dialog = await screen.findByRole('dialog', { name: s.enterTitle });
    typeRecoveryName(dialog);
    fireEvent.change(within(dialog).getByLabelText(s.codeLabel), {
      target: { value: owner.recoveryCode },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: s.recoverAction }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(s.undoFirstShort);
    expect(await keyStore.load()).toBeNull();
  });

  it('has no New recovery code on a reader device', async () => {
    const owner = await ownerRecord();
    const reader = createMemoryKeyStore({ ...(owner.record as DeviceRecord), role: 'reader' });
    renderSync(controlOf(owner.relay, reader));
    expect(await row(s.syncNow)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: s.stopViewing })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: s.turnOff })).toBeNull();
    expect(screen.queryByRole('button', { name: s.newCode })).toBeNull();
    expect(screen.queryByRole('button', { name: s.invite })).toBeNull();
    expect(screen.queryByRole('button', { name: s.invitePartner })).toBeNull();
    expect(screen.queryByRole('button', { name: s.devices })).toBeNull();
  });

  it('stops viewing the shared chart on a reader device after a confirmation', async () => {
    const owner = await ownerRecord();
    const reader = createMemoryKeyStore({ ...(owner.record as DeviceRecord), role: 'reader' });
    const own = [makeObservation({ date: '2026-09-01', bleeding: 'M' })];
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, JSON.stringify(own));
    localStorage.setItem(STORAGE_SHARED_CHART_KEY, '[]');
    localStorage.setItem(STORAGE_SHARED_READ_KEY, '2026-10-12');
    // The date of the own days is not the date of the shared chart
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, '2026-01-02');
    localStorage.setItem(STORAGE_SYNC_STATE_KEY, '{}');
    localStorage.setItem(STORAGE_SYNC_CONFLICTS_KEY, '[]');
    const { onRecordChange } = renderSync(controlOf(owner.relay, reader), 'en', own);
    expect(await row(s.syncNow)).toHaveAccessibleDescription('Last sync: Oct 12, 2026');
    fireEvent.click(await row(s.stopViewing));
    const confirm = await screen.findByRole('dialog', { name: s.stopViewingTitle });
    expect(confirm).toHaveTextContent(s.stopViewingMessage);
    fireEvent.click(within(confirm).getByRole('button', { name: s.stopViewing }));
    expect(await row(s.turnOn)).toBeInTheDocument();
    expect(await reader.load()).toBeNull();
    for (const key of [
      STORAGE_SHARED_CHART_KEY,
      STORAGE_SYNC_STATE_KEY,
      STORAGE_SYNC_CONFLICTS_KEY,
    ])
      expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(STORAGE_OBSERVATIONS_KEY)).toContain('2026-09-01');
    expect(onRecordChange).toHaveBeenLastCalledWith(null);
    // A reader cannot write the vault: the owner device removes it in the device list
    expect(owner.objects.size).toBeGreaterThan(0);
  });

  it('turns off the sync on this device after a confirmation', async () => {
    const owner = await ownerRecord();
    localStorage.setItem(STORAGE_SYNC_STATE_KEY, '{}');
    localStorage.setItem(STORAGE_SYNC_CONFLICTS_KEY, '[]');
    const { onRecordChange } = renderSync(controlOf(owner.relay, owner.keyStore));
    fireEvent.click(await row(s.turnOff));
    let confirm = await screen.findByRole('dialog', { name: s.turnOffTitle });
    expect(confirm).toHaveTextContent(s.turnOffMessage);
    fireEvent.click(within(confirm).getByRole('button', { name: en.actions.cancel }));
    expect(screen.queryByRole('dialog', { name: s.turnOffTitle })).toBeNull();
    expect(await owner.keyStore.load()).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: s.turnOff }));
    confirm = await screen.findByRole('dialog', { name: s.turnOffTitle });
    fireEvent.click(within(confirm).getByRole('button', { name: s.turnOffConfirm }));
    expect(await row(s.turnOn)).toBeInTheDocument();
    expect(await owner.keyStore.load()).toBeNull();
    expect(localStorage.getItem(STORAGE_SYNC_STATE_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_SYNC_CONFLICTS_KEY)).toBeNull();
    expect(onRecordChange).toHaveBeenLastCalledWith(null);
    // The vault stays on the relay for the other devices
    expect(owner.objects.size).toBeGreaterThan(0);
  });

  it('syncs now and shows the date of the last sync', async () => {
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, '2026-10-12');
    const owner = await ownerRecord();
    let release: () => void = () => {};
    const syncNow = vi.fn(
      () =>
        new Promise<SyncOutcome>(resolve => {
          release = () => resolve({ sent: true, skipped: false, error: null });
        })
    );
    renderSync(controlOf(owner.relay, owner.keyStore, { syncNow }), 'fr');
    const syncRow = await row(fr.sync.syncNow);
    expect(syncRow.getAttribute('aria-describedby')).toBeTruthy();
    expect(syncRow).toHaveAccessibleDescription(/12 oct\. 2026/);
    fireEvent.click(syncRow);
    expect(syncRow).toBeDisabled();
    fireEvent.click(syncRow);
    expect(syncNow).toHaveBeenCalledTimes(1);
    await act(async () => release());
    expect(syncRow).toBeEnabled();
  });

  it('shows the error of the last sync while the device has a record', async () => {
    const owner = await ownerRecord();
    const lastError = new VaultError('relay', { status: 0, error: 'network' });
    renderSync(controlOf(owner.relay, owner.keyStore, { lastError }));
    expect(await screen.findByRole('alert')).toHaveTextContent(s.noConnection);

    const empty = renderSync(controlOf(owner.relay, createMemoryKeyStore(), { lastError }));
    expect(await within(empty.container).findByRole('button', { name: s.turnOn })).toBeVisible();
    expect(within(empty.container).queryByRole('alert')).toBeNull();
  });

  it('gives an error when the sync code does not load', async () => {
    renderSync({
      enabled: true,
      services: () => Promise.reject(new Error('chunk')),
      syncNow: vi.fn(),
      withSync: () => Promise.reject(new Error('chunk')),
      lastError: null,
      conflicts: [],
      resolveConflict: vi.fn(async () => {}),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(s.failed);
    expect(screen.queryByRole('button', { name: s.turnOn })).toBeNull();
  });

  it('keeps Settings open while a code action runs and while the code shows', async () => {
    const harness = createRelayHarness();
    const { onBusyChange } = renderSync(controlOf(harness.relay, createMemoryKeyStore()));
    const calls = () => onBusyChange.mock.calls.map(([busy]) => busy);
    fireEvent.click(await row(s.turnOn));
    await nameAndTurnOn();
    const dialog = await screen.findByRole('dialog', { name: s.codeTitle });
    expect(calls()).toEqual([false, true]);
    fireEvent.click(within(dialog).getByRole('button', { name: s.wroteItDown }));
    expect(calls()).toEqual([false, true, false]);

    // Sync now and Turn off make no code: Settings can close while they run
    fireEvent.click(await row(s.syncNow));
    fireEvent.click(await row(s.turnOff));
    const confirm = await screen.findByRole('dialog', { name: s.turnOffTitle });
    fireEvent.click(within(confirm).getByRole('button', { name: s.turnOffConfirm }));
    expect(await row(s.turnOn)).toBeInTheDocument();
    expect(calls()).toEqual([false, true, false]);
  });

  it('shows the record that another tab saved, and makes no second vault', async () => {
    const owner = await ownerRecord();
    const keyStore = createMemoryKeyStore();
    renderSync(controlOf(owner.relay, keyStore));
    const turnOn = await row(s.turnOn);
    const recoverRow = screen.getByRole('button', { name: s.recover });
    await keyStore.save(owner.record);
    const count = owner.objects.size;
    fireEvent.click(turnOn);
    await nameAndTurnOn();
    expect(await row(s.syncNow)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: s.codeTitle })).toBeNull();
    expect(owner.objects.size).toBe(count);

    // The same for a recovery that starts before the other tab saves its record
    await keyStore.clear();
    fireEvent.click(await row(s.turnOff));
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: s.turnOffTitle })).getByRole('button', {
        name: s.turnOffConfirm,
      })
    );
    expect(recoverRow).not.toBeInTheDocument();
    fireEvent.click(await row(s.recover));
    const dialog = await screen.findByRole('dialog', { name: s.enterTitle });
    await keyStore.save(owner.record);
    typeRecoveryName(dialog);
    fireEvent.change(within(dialog).getByLabelText(s.codeLabel), {
      target: { value: owner.recoveryCode },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: s.recoverAction }));
    expect(await row(s.syncNow)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: s.codeTitle })).toBeNull();
    expect(owner.objects.size).toBe(count);
  });

  it('shows the rows of the record that a recovery saved before its new code failed', async () => {
    const owner = await ownerRecord();
    const keyStore = createMemoryKeyStore();
    const { onRecordChange } = renderSync(controlOf(owner.relay, keyStore));
    fireEvent.click(await row(s.recover));
    const dialog = await screen.findByRole('dialog', { name: s.enterTitle });
    owner.failWhen(
      request => request.method === 'PUT' && new URL(request.url).pathname.includes('/recovery/')
    );
    typeRecoveryName(dialog);
    fireEvent.change(within(dialog).getByLabelText(s.codeLabel), {
      target: { value: owner.recoveryCode },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: s.recoverAction }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(s.noConnection);
    expect(await keyStore.load()).not.toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    expect(await row(s.syncNow)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: s.newCode })).toBeEnabled();
    expect(onRecordChange).toHaveBeenLastCalledWith('owner');
  });

  it('keeps the rows when the key store does not load again after a failure', async () => {
    const keyStore = createMemoryKeyStore();
    const services: SyncServices = { relay: failingRelay(500), keyStore, runner };
    let loads = 0;
    renderSync({
      enabled: true,
      services: () => (loads++ === 0 ? Promise.resolve(services) : Promise.reject(new Error('x'))),
      syncNow: vi.fn(),
      withSync: () => Promise.reject(new Error('chunk')),
      lastError: null,
      conflicts: [],
      resolveConflict: vi.fn(async () => {}),
    });
    fireEvent.click(await row(s.turnOn));
    await nameAndTurnOn();
    expect(await screen.findByRole('alert')).toHaveTextContent(s.failed);
    expect(screen.getByRole('button', { name: s.turnOn })).toBeEnabled();
  });

  it('removes the demo days before the device joins a vault', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    const own = makeObservation({ date: '2026-10-01', bleeding: 'H' });
    const demo = buildDemoObservations('2026-10-20');
    renderSync(controlOf(harness.relay, keyStore), 'en', [...demo, own]);
    fireEvent.click(await row(s.turnOn));
    await nameAndTurnOn();
    await screen.findByRole('dialog', { name: s.codeTitle });
    const stored = JSON.parse(localStorage.getItem(STORAGE_OBSERVATIONS_KEY) as string);
    expect(stored.map((o: Observation) => o.date)).toEqual(['2026-10-01']);
  });

  it('does not join a vault when the browser refuses the list without the demo days', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    renderSync(controlOf(harness.relay, keyStore), 'en', buildDemoObservations('2026-10-20'));
    const turnOn = await row(s.turnOn);
    const write = localStorage.setItem.bind(localStorage);
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === STORAGE_OBSERVATIONS_KEY) throw new Error('QuotaExceededError');
      write(key, value);
    });
    fireEvent.click(turnOn);
    await nameAndTurnOn();
    expect(await screen.findByRole('alert')).toHaveTextContent(s.failed);
    setItem.mockRestore();
    expect(await keyStore.load()).toBeNull();
    expect(harness.objects.size).toBe(0);
  });

  it('shows Turn on sync when the record went away before New recovery code', async () => {
    const owner = await ownerRecord();
    renderSync(controlOf(owner.relay, owner.keyStore));
    const newCode = await row(s.newCode);
    await owner.keyStore.clear();
    fireEvent.click(newCode);
    expect(await row(s.turnOn)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: s.codeTitle })).toBeNull();
  });

  it('turns off the sync only after the sync that runs, so that the sync cannot undo it', async () => {
    const owner = await ownerRecord();
    let release: () => void = () => {};
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    let started = false;
    const services: SyncServices = {
      relay: owner.relay,
      keyStore: owner.keyStore,
      runner: {
        ...runner,
        runSync: async input => {
          started = true;
          await blocked;
          return runner.runSync(input);
        },
      },
    };
    const load = async () => services;
    renderWithProviders(<SyncHarness load={load} />);
    fireEvent.click(await row(s.turnOff));
    await waitFor(() => expect(started).toBe(true));
    const confirm = await screen.findByRole('dialog', { name: s.turnOffTitle });
    fireEvent.click(within(confirm).getByRole('button', { name: s.turnOffConfirm }));
    // The turn off waits: the rows stay disabled
    await waitFor(() => expect(screen.getByRole('button', { name: s.syncNow })).toBeDisabled());
    expect(await owner.keyStore.load()).not.toBeNull();
    await act(async () => release());
    expect(await row(s.turnOn)).toBeInTheDocument();
    expect(await owner.keyStore.load()).toBeNull();
    expect(localStorage.getItem(STORAGE_SYNC_STATE_KEY)).toBeNull();
  });
});
