import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en, fr } from '../../../i18n';
import { formatRecoveryCode, newRecoverySecret } from '../../../domain/vault/recoveryCode';
import type { SyncControl, SyncServices } from '../../../hooks/useSync';
import { VaultError, createVault } from '../../../sync/deviceVault';
import type { DeviceRecord, KeyStore } from '../../../sync/keyStore';
import { createRelayClient } from '../../../sync/relayClient';
import type { RelayClient } from '../../../sync/relayClient';
import * as runner from '../../../sync/syncRunner';
import { renderWithProviders } from '../../../test/render';
import { createMemoryKeyStore, createRelayHarness } from '../../../test/relayHarness';
import {
  STORAGE_LAST_SYNC_KEY,
  STORAGE_SYNC_CONFLICTS_KEY,
  STORAGE_SYNC_STATE_KEY,
} from '../../../utils/storageKeys';
import { SyncSettings, failureOf } from '../SyncSettings';

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
    lastError: null,
    ...extra,
  } as SyncControl & { syncNow: ReturnType<typeof vi.fn> };
};

const renderSync = (control: SyncControl, language: 'en' | 'fr' = 'en') => {
  const onRecordChange = vi.fn();
  const view = renderWithProviders(
    <SyncSettings control={control} onRecordChange={onRecordChange} />,
    { language }
  );
  return { onRecordChange, ...view };
};

const row = (name: string) => screen.findByRole('button', { name });
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
  const made = await createVault(harness.relay, keyStore);
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
    expect(onRecordChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('button', { name: s.syncNow })).toBeNull();
    fireEvent.click(await row(s.turnOn));

    const dialog = await screen.findByRole('dialog', { name: s.codeTitle });
    expect(dialog).toHaveAccessibleDescription(s.codeNote);
    expect(codeOf(dialog)).toMatch(CODE);
    expect(await keyStore.load()).toMatchObject({ role: 'owner' });
    expect(control.syncNow).toHaveBeenCalledTimes(1);
    expect(onRecordChange).toHaveBeenLastCalledWith(true);

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
    expect(await screen.findByRole('alert')).toHaveTextContent(s.noConnection);
    expect(await keyStore.load()).toBeNull();
    expect(screen.getByRole('button', { name: s.turnOn })).toBeEnabled();
  });

  it('gives sync not available when the relay has no bucket', async () => {
    renderSync(controlOf(failingRelay(503), createMemoryKeyStore()));
    fireEvent.click(await row(s.turnOn));
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
    fireEvent.change(input, { target: { value: await formatRecoveryCode(newRecoverySecret()) } });
    fireEvent.submit(input);
    const working = await within(dialog).findByRole('button', { name: s.working });
    expect(working).toBeDisabled();
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

  it('has no New recovery code on a reader device', async () => {
    const owner = await ownerRecord();
    const reader = createMemoryKeyStore({ ...(owner.record as DeviceRecord), role: 'reader' });
    renderSync(controlOf(owner.relay, reader));
    expect(await row(s.syncNow)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: s.turnOff })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: s.newCode })).toBeNull();
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
    expect(onRecordChange).toHaveBeenLastCalledWith(false);
    // The vault stays on the relay for the other devices
    expect(owner.objects.size).toBeGreaterThan(0);
  });

  it('syncs now and shows the date of the last sync', async () => {
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, '2026-10-12');
    const owner = await ownerRecord();
    let release: () => void = () => {};
    const syncNow = vi.fn(
      () =>
        new Promise<void>(resolve => {
          release = resolve;
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
      lastError: null,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(s.failed);
    expect(screen.queryByRole('button', { name: s.turnOn })).toBeNull();
  });
});

describe('failureOf', () => {
  it('gives the cause of each error', () => {
    expect(failureOf(new Error('x'))).toBe('failed');
    expect(failureOf('x')).toBe('failed');
    expect(failureOf(new VaultError('code'))).toBe('badCode');
    expect(failureOf(new VaultError('keys'))).toBe('failed');
    expect(failureOf(new VaultError('relay'))).toBe('failed');
    expect(failureOf(new VaultError('relay', { status: 0 }))).toBe('noConnection');
    expect(failureOf(new VaultError('relay', { status: 503 }))).toBe('unavailable');
    expect(failureOf(new VaultError('relay', { status: 404 }))).toBe('failed');
    expect(failureOf(new VaultError('relay', { status: 404 }), true)).toBe('badCode');
    expect(failureOf(new VaultError('relay', { status: 500 }), true)).toBe('failed');
  });
});
