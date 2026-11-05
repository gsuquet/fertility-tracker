import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en, formatMessage } from '../../../i18n';
import { createVault } from '../../../sync/deviceVault';
import {
  approveInvitation,
  checkAsNewDevice,
  checkAsOwner,
  finishJoin,
  startInvitation,
  startJoin,
} from '../../../sync/invitationFlow';
import type { DeviceRecord, KeyStore } from '../../../sync/keyStore';
import type { RelayClient } from '../../../sync/relayClient';
import { renderWithProviders } from '../../../test/render';
import { createMemoryKeyStore, createRelayHarness } from '../../../test/relayHarness';
import { controlOf } from '../../../test/syncControl';
import { DevicesDialog } from '../DevicesDialog';
import { SyncSettings } from '../SyncSettings';

const s = en.sync;

const join = async (
  relay: RelayClient,
  ownerStore: KeyStore,
  role: 'owner' | 'reader',
  name: string
) => {
  const ownerRecord = (await ownerStore.load()) as DeviceRecord;
  const owner = await startInvitation(relay, ownerStore, ownerRecord, role);
  const state = await startJoin(relay, owner.invitation, name);
  await checkAsOwner(relay, ownerRecord, owner);
  await checkAsNewDevice(relay, state);
  await checkAsOwner(relay, ownerRecord, owner);
  await approveInvitation(relay, ownerStore, ownerRecord, owner);
  const answered = await checkAsNewDevice(relay, state);
  if (answered.status !== 'answered') throw new Error(answered.status);
  const store = createMemoryKeyStore();
  return finishJoin(relay, store, state, answered.offer, answered.content);
};

const vault = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  await createVault(harness.relay, keyStore, 'Phone');
  const tablet = await join(harness.relay, keyStore, 'owner', 'Tablet');
  const partner = await join(harness.relay, keyStore, 'reader', 'Sam');
  return { ...harness, keyStore, tablet, partner };
};

const devicesDialog = () => screen.findByRole('dialog', { name: s.devices });
const items = async () => within(await devicesDialog()).findAllByRole('listitem');

describe('DevicesDialog', () => {
  it('opens from Devices on an owner device, and lists the members', async () => {
    const v = await vault();
    renderWithProviders(
      <SyncSettings
        control={controlOf(v.relay, v.keyStore)}
        onRecordChange={() => {}}
        onBusyChange={() => {}}
      />
    );
    const row = await screen.findByRole('button', { name: s.devices });
    expect(row).toHaveAccessibleDescription(s.devicesHint);
    fireEvent.click(row);
    const dialog = await devicesDialog();
    expect(dialog).toHaveAccessibleDescription(s.devicesNote);
    const list = await items();
    expect(list.map(item => item.textContent)).toEqual([
      `Phone${s.deviceThis} · ${s.deviceOwner}`,
      `${s.deviceRecovery}${s.deviceRecoveryHint}`,
      `Tablet${s.deviceOwner}${s.deviceRemove}`,
      `Sam${s.deviceReader}${s.deviceRemove}`,
    ]);
    expect(within(dialog).getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.close }));
    expect(screen.queryByRole('dialog', { name: s.devices })).toBeNull();
  });

  it('removes a partner after a confirmation, without a new code', async () => {
    const v = await vault();
    const onCode = vi.fn();
    renderWithProviders(
      <DevicesDialog control={controlOf(v.relay, v.keyStore)} onCode={onCode} onClose={vi.fn()} />
    );
    await items();
    fireEvent.click(screen.getByRole('button', { name: `${s.deviceRemove} Sam` }));
    let confirm = await screen.findByRole('dialog', {
      name: formatMessage(s.removeTitle, { name: 'Sam' }),
    });
    expect(confirm).toHaveTextContent(s.removeMessage);
    // Cancel keeps the partner
    fireEvent.click(within(confirm).getByRole('button', { name: en.actions.cancel }));
    expect(await items()).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: `${s.deviceRemove} Sam` }));
    confirm = await screen.findByRole('dialog', {
      name: formatMessage(s.removeTitle, { name: 'Sam' }),
    });
    fireEvent.click(within(confirm).getByRole('button', { name: s.deviceRemove }));
    await waitFor(async () => expect(await items()).toHaveLength(3));
    expect(screen.queryByText('Sam')).toBeNull();
    expect(onCode).not.toHaveBeenCalled();
  });

  it('removes an owner device, then Settings shows the new recovery code', async () => {
    const v = await vault();
    const onBusyChange = vi.fn();
    renderWithProviders(
      <SyncSettings
        control={controlOf(v.relay, v.keyStore)}
        onRecordChange={() => {}}
        onBusyChange={onBusyChange}
      />
    );
    fireEvent.click(await screen.findByRole('button', { name: s.devices }));
    await items();
    fireEvent.click(screen.getByRole('button', { name: `${s.deviceRemove} Tablet` }));
    const confirm = await screen.findByRole('dialog', {
      name: formatMessage(s.removeTitle, { name: 'Tablet' }),
    });
    expect(confirm).toHaveTextContent(s.removeOwnerMessage);
    fireEvent.click(within(confirm).getByRole('button', { name: s.deviceRemove }));
    const code = await screen.findByRole('dialog', { name: s.codeTitle });
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(within(code).getByRole('button', { name: s.wroteItDown }));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    await waitFor(async () => expect(await items()).toHaveLength(3));
    expect(screen.queryByText('Tablet')).toBeNull();
  });

  it('shows the names that are missing, Working while it loads, and the cause of a failure', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    await createVault(harness.relay, keyStore, 'Phone');
    let release: () => void = () => {};
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    const relay: RelayClient = {
      ...harness.relay,
      getVault: async (...args) => {
        await blocked;
        return harness.relay.getVault(...args);
      },
    };
    const onClose = vi.fn();
    renderWithProviders(
      <DevicesDialog control={controlOf(relay, keyStore)} onCode={vi.fn()} onClose={onClose} />
    );
    const dialog = await devicesDialog();
    expect(within(dialog).getByRole('status')).toHaveTextContent(s.working);
    expect(within(dialog).getByRole('button', { name: en.actions.close })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => release());
    expect(await items()).toHaveLength(2);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a member without a name, the cause of a failure, and no list without a record', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    await createVault(harness.relay, keyStore, 'Phone');
    // A vault without the names
    const { openSession, writeSession } = await import('../../../sync/deviceVault');
    const session = await openSession(harness.relay, keyStore, (await keyStore.load()) as never);
    await writeSession(harness.relay, keyStore, session, {
      keyring: session.header.keyring.map(({ name: _name, ...member }) => member),
    });
    const first = renderWithProviders(
      <DevicesDialog
        control={controlOf(harness.relay, keyStore)}
        onCode={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect((await items())[0]).toHaveTextContent(s.deviceNoName);
    first.unmount();

    harness.failWhen(() => true);
    const second = renderWithProviders(
      <DevicesDialog
        control={controlOf(harness.relay, keyStore)}
        onCode={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(await within(await devicesDialog()).findByRole('alert')).toHaveTextContent(
      s.noConnection
    );
    expect(screen.queryByRole('list')).toBeNull();
    second.unmount();

    harness.failWhen(null);
    await keyStore.clear();
    renderWithProviders(
      <DevicesDialog
        control={controlOf(harness.relay, keyStore)}
        onCode={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const dialog = await devicesDialog();
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: en.actions.close })).toBeEnabled()
    );
    expect(within(dialog).queryAllByRole('listitem')).toHaveLength(0);
  });
});
