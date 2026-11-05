import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../../i18n';
import { buildDemoObservations } from '../../domain/demoData';
import { inviteLink } from '../../domain/vault/invitation';
import { createVault } from '../../sync/deviceVault';
import { startInvitation } from '../../sync/invitationFlow';
import type { KeyStore } from '../../sync/keyStore';
import type { RelayClient } from '../../sync/relayClient';
import { makeObservation } from '../../test/factories';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import { renderWithProviders } from '../../test/render';
import { controlOf } from '../../test/syncControl';
import type { Observation } from '../../types/crms';
import { STORAGE_OBSERVATIONS_KEY, STORAGE_UNDO_KEY } from '../../utils/storageKeys';
import { JoinDialog } from '../JoinDialog';

const s = en.sync;
const POLL = 10;

/** A vault, and an invitation of its owner device. */
const invited = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  const { record } = await createVault(harness.relay, keyStore);
  const owner = await startInvitation(harness.relay, keyStore, record, 'owner');
  const link = inviteLink('https://app.test/', owner.invitation);
  return { ...harness, keyStore, record, owner, fragment: link.slice(link.indexOf('#')) };
};

const renderJoin = (
  relay: RelayClient,
  keyStore: KeyStore,
  fragment: string,
  observations?: Observation[]
) => {
  const onClose = vi.fn();
  const control = controlOf(relay, keyStore);
  renderWithProviders(
    <JoinDialog control={control} fragment={fragment} onClose={onClose} pollMs={POLL} />,
    observations ? { observations } : {}
  );
  return { onClose, control };
};

const joinDialog = () => screen.findByRole('dialog', { name: s.joinTitle });
const alertText = async () => (await within(await joinDialog()).findByRole('alert')).textContent;

describe('JoinDialog', () => {
  it('stops on a device that already syncs', async () => {
    const vault = await invited();
    const { onClose } = renderJoin(vault.relay, vault.keyStore, vault.fragment);
    expect(await alertText()).toBe(s.alreadySynced);
    fireEvent.click(within(await joinDialog()).getByRole('button', { name: s.close }));
    expect(onClose).toHaveBeenCalled();
  });

  it('stops while an undo copy exists', async () => {
    const vault = await invited();
    localStorage.setItem(STORAGE_UNDO_KEY, JSON.stringify([]));
    renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    expect(await alertText()).toBe(s.undoFirst);
  });

  it('stops on a link that is not valid', async () => {
    const vault = await invited();
    renderJoin(vault.relay, createMemoryKeyStore(), '#invite=abc.def');
    expect(await alertText()).toBe(s.badLink);
  });

  it('gives the cause of a failure', async () => {
    const vault = await invited();
    vault.failWhen(() => true);
    renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    expect(await alertText()).toBe(s.noConnection);
  });

  it('deletes the invitation on Cancel', async () => {
    const vault = await invited();
    const { onClose } = renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    const dialog = await joinDialog();
    await waitFor(async () =>
      expect(
        JSON.parse(
          await vault.relay
            .getInvite(vault.owner.invitation.id, vault.record.token)
            .then(r => (r.ok ? r.text : '{}'))
        ).request
      ).toBeDefined()
    );
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    expect(onClose).toHaveBeenCalled();
    await waitFor(() =>
      expect([...vault.objects.keys()].some(key => key.startsWith('invites/'))).toBe(false)
    );
  });

  it('stops its checks when it goes away', async () => {
    const vault = await invited();
    const first = renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    await joinDialog();
    await new Promise(resolve => setTimeout(resolve, POLL * 3));
    vault.failWhen(request => request.method === 'GET');
    cleanup();
    await new Promise(resolve => setTimeout(resolve, POLL * 5));
    expect(first.onClose).not.toHaveBeenCalled();
    vault.failWhen(null);

    // A check that ends after the close changes nothing
    const other = await invited();
    let checks = 0;
    const relay: RelayClient = {
      ...other.relay,
      getInvite: async (...args) => {
        checks += 1;
        return other.relay.getInvite(...args);
      },
    };
    const second = renderJoin(relay, createMemoryKeyStore(), other.fragment);
    await joinDialog();
    cleanup();
    await waitFor(() => expect(checks).toBeGreaterThan(0));
    await new Promise(resolve => setTimeout(resolve, POLL));
    expect(second.onClose).not.toHaveBeenCalled();
  });

  it('closes without a delete before the join request', async () => {
    const vault = await invited();
    const { onClose } = renderJoin(vault.relay, createMemoryKeyStore(), '#invite=abc.def');
    fireEvent.keyDown(await joinDialog(), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    expect([...vault.objects.keys()].some(key => key.startsWith('invites/'))).toBe(true);
  });

  it('gives an expired invitation when the relay has no invitation', async () => {
    const vault = await invited();
    await vault.relay.deleteInvite(vault.owner.invitation.id, vault.record.token);
    renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    expect(await alertText()).toBe(s.expired);
  });

  it('stops when the offer is not valid', async () => {
    const vault = await invited();
    renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    await joinDialog();
    // The relay gives an offer that is not an offer
    await waitFor(async () => {
      const result = await vault.relay.postInvite(
        vault.owner.invitation.id,
        'offer',
        { nonce: 1 },
        vault.record.token
      );
      expect(result.ok).toBe(true);
    });
    expect(await alertText()).toBe(s.refused);
  });

  it('does not join when another tab joined, or when the browser refuses the list without the demo days', async () => {
    const { approveInvitation, checkAsOwner } = await import('../../sync/invitationFlow');
    for (const problem of ['tab', 'storage'] as const) {
      const vault = await invited();
      const keyStore = createMemoryKeyStore();
      renderJoin(vault.relay, keyStore, vault.fragment, buildDemoObservations('2026-10-20'));
      const dialog = await joinDialog();
      await waitFor(async () =>
        expect((await checkAsOwner(vault.relay, vault.record, vault.owner)).status).toBe('confirm')
      );
      fireEvent.click(await within(dialog).findByRole('button', { name: s.codesMatch }));
      if (problem === 'tab') await keyStore.save(vault.record);
      const write = localStorage.setItem.bind(localStorage);
      const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (problem === 'storage' && key === STORAGE_OBSERVATIONS_KEY) throw new Error('Quota');
        write(key, value);
      });
      await approveInvitation(vault.relay, vault.keyStore, vault.record, vault.owner);
      expect(await alertText()).toBe(problem === 'tab' ? s.alreadySynced : s.failed);
      setItem.mockRestore();
      if (problem === 'storage') expect(await keyStore.load()).toBeNull();
      cleanup();
      localStorage.clear();
    }
  });

  it('keeps the observations of the user at the join', async () => {
    const vault = await invited();
    const keyStore = createMemoryKeyStore();
    const day = makeObservation({ date: '2026-10-01', bleeding: 'H' });
    renderJoin(vault.relay, keyStore, vault.fragment, [day]);
    const dialog = await joinDialog();
    const { approveInvitation, checkAsOwner } = await import('../../sync/invitationFlow');
    await waitFor(async () =>
      expect((await checkAsOwner(vault.relay, vault.record, vault.owner)).status).toBe('confirm')
    );
    await approveInvitation(vault.relay, vault.keyStore, vault.record, vault.owner);
    fireEvent.click(await within(dialog).findByRole('button', { name: s.codesMatch }));
    expect(await within(dialog).findByText(s.joinDone)).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_OBSERVATIONS_KEY) as string);
    expect(stored).toHaveLength(1);
  });
});
