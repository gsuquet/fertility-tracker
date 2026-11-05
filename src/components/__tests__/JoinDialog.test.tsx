import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useCycle } from '../../context/CycleContext';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
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
  const { record } = await createVault(harness.relay, keyStore, 'Phone');
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

/** Loads the demo cycles, which makes an undo copy. */
const Undo = () => {
  const { loadDemoData } = useCycle();
  return (
    <button type="button" onClick={loadDemoData}>
      demo
    </button>
  );
};

const joinDialog = () => screen.findByRole('dialog', { name: s.joinTitle });
/** Types the name of the device and continues. */
const typeName = async (name = 'Tablet') => {
  const dialog = await joinDialog();
  fireEvent.change(await within(dialog).findByLabelText(s.nameLabel), {
    target: { value: name },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: s.nameContinue }));
};
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

  it('asks for the name of the device before it sends the join request', async () => {
    const vault = await invited();
    const postInvite = vi.spyOn(vault.relay, 'postInvite');
    const { onClose } = renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    const dialog = await joinDialog();
    const field = await within(dialog).findByLabelText(s.nameLabel);
    expect(within(dialog).getByRole('status')).toHaveTextContent(s.nameNote);
    fireEvent.click(within(dialog).getByRole('button', { name: s.nameContinue }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(s.nameInvalid);
    fireEvent.change(field, { target: { value: 'x'.repeat(41) } });
    expect(within(dialog).queryByRole('alert')).toBeNull();
    fireEvent.submit(field);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(s.nameInvalid);
    await new Promise(resolve => setTimeout(resolve, POLL * 3));
    expect(postInvite).not.toHaveBeenCalled();

    // Enter sends the name, without the spaces at the ends
    fireEvent.change(field, { target: { value: ' Tablet ' } });
    fireEvent.submit(field);
    expect(within(dialog).getByRole('status')).toHaveTextContent(s.joinWaiting);
    await waitFor(() => expect(postInvite).toHaveBeenCalledTimes(1));
    const { checkAsOwner } = await import('../../sync/invitationFlow');
    await waitFor(async () =>
      expect(await checkAsOwner(vault.relay, vault.record, vault.owner)).toMatchObject({
        status: 'confirm',
        name: 'Tablet',
      })
    );
    fireEvent.click(await within(dialog).findByRole('button', { name: s.codesDiffer }));
    expect(onClose).toHaveBeenCalled();
  });

  it('gives the cause of a failure', async () => {
    const vault = await invited();
    vault.failWhen(() => true);
    renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    await typeName();
    expect(await alertText()).toBe(s.noConnection);
  });

  it('deletes the invitation on Cancel', async () => {
    const vault = await invited();
    const { onClose } = renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    await typeName();
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
    await typeName();
    await joinDialog();
    await new Promise(resolve => setTimeout(resolve, POLL * 3));
    vault.failWhen(request => request.method === 'GET');
    cleanup();
    await new Promise(resolve => setTimeout(resolve, POLL * 5));
    expect(first.onClose).not.toHaveBeenCalled();
    vault.failWhen(null);

    // A close while the request goes: the invitation stops
    const other = await invited();
    let release: () => void = () => {};
    const sent = new Promise<void>(resolve => {
      release = resolve;
    });
    const relay: RelayClient = {
      ...other.relay,
      postInvite: async (...args) => {
        await sent;
        return other.relay.postInvite(...args);
      },
    };
    const second = renderJoin(relay, createMemoryKeyStore(), other.fragment);
    await typeName();
    await joinDialog();
    cleanup();
    release();
    await waitFor(() =>
      expect([...other.objects.keys()].some(key => key.startsWith('invites/'))).toBe(false)
    );
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
    await typeName();
    expect(await alertText()).toBe(s.expired);
  });

  it('stops when the offer is not valid', async () => {
    const vault = await invited();
    renderJoin(vault.relay, createMemoryKeyStore(), vault.fragment);
    await typeName();
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
      await typeName();
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

  it('sends one join request in StrictMode, and checks again after a lost connection', async () => {
    configure({ reactStrictMode: true });
    onTestFinished(() => configure({ reactStrictMode: false }));
    const vault = await invited();
    const postInvite = vi.spyOn(vault.relay, 'postInvite');
    renderWithProviders(
      <JoinDialog
        control={controlOf(vault.relay, createMemoryKeyStore())}
        fragment={vault.fragment}
        onClose={vi.fn()}
        pollMs={POLL}
      />
    );
    await typeName();
    const dialog = await joinDialog();
    await waitFor(() => expect(postInvite).toHaveBeenCalledTimes(1));
    vault.failWhen(request => request.method === 'GET');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(s.noConnection);
    vault.failWhen(null);
    await waitFor(() => expect(within(dialog).queryByRole('alert')).toBeNull());
    expect(within(dialog).getByRole('status')).toHaveTextContent(s.joinWaiting);
    expect(postInvite).toHaveBeenCalledTimes(1);
  });

  it('does not join when the user cancels while a check runs', async () => {
    const vault = await invited();
    const keyStore = createMemoryKeyStore();
    let hold: Promise<void> | null = null;
    let release: () => void = () => {};
    const relay: RelayClient = {
      ...vault.relay,
      getInvite: async (...args) => {
        const result = await vault.relay.getInvite(...args);
        if (hold) await hold;
        return result;
      },
    };
    const { onClose, control } = renderJoin(relay, keyStore, vault.fragment);
    await typeName();
    const dialog = await joinDialog();
    const { approveInvitation, checkAsOwner } = await import('../../sync/invitationFlow');
    await waitFor(async () =>
      expect((await checkAsOwner(vault.relay, vault.record, vault.owner)).status).toBe('confirm')
    );
    fireEvent.click(await within(dialog).findByRole('button', { name: s.codesMatch }));
    await approveInvitation(vault.relay, vault.keyStore, vault.record, vault.owner);
    // The next check reads the answer, then waits until the user cancelled
    hold = new Promise<void>(resolve => {
      release = resolve;
    });
    await new Promise(resolve => setTimeout(resolve, POLL * 3));
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    expect(onClose).toHaveBeenCalled();
    release();
    await new Promise(resolve => setTimeout(resolve, POLL * 5));
    expect(await keyStore.load()).toBeNull();
    expect(control.syncNow).not.toHaveBeenCalled();
  });

  it('ends on a relay error that is not temporary', async () => {
    const vault = await invited();
    const relay: RelayClient = {
      ...vault.relay,
      getInvite: async () => ({ ok: false, status: 500, error: 'x' }),
    };
    renderJoin(relay, createMemoryKeyStore(), vault.fragment);
    await typeName();
    expect(await alertText()).toBe(s.failed);
    await waitFor(() =>
      expect([...vault.objects.keys()].some(key => key.startsWith('invites/'))).toBe(false)
    );
  });

  it('does not join when an undo copy came while the dialog was open', async () => {
    const vault = await invited();
    const keyStore = createMemoryKeyStore();
    const { approveInvitation, checkAsOwner } = await import('../../sync/invitationFlow');
    renderWithProviders(
      <>
        <JoinDialog
          control={controlOf(vault.relay, keyStore)}
          fragment={vault.fragment}
          onClose={vi.fn()}
          pollMs={POLL}
        />
        <Undo />
      </>,
      { observations: [makeObservation({ date: '2026-10-01', bleeding: 'H' })] }
    );
    await typeName();
    const dialog = await joinDialog();
    await waitFor(async () =>
      expect((await checkAsOwner(vault.relay, vault.record, vault.owner)).status).toBe('confirm')
    );
    fireEvent.click(screen.getByRole('button', { name: 'demo', hidden: true }));
    await approveInvitation(vault.relay, vault.keyStore, vault.record, vault.owner);
    fireEvent.click(await within(dialog).findByRole('button', { name: s.codesMatch }));
    expect(await alertText()).toBe(s.undoFirst);
    expect(await keyStore.load()).toBeNull();
  });

  it('keeps the observations of the user at the join', async () => {
    const vault = await invited();
    const keyStore = createMemoryKeyStore();
    const day = makeObservation({ date: '2026-10-01', bleeding: 'H' });
    renderJoin(vault.relay, keyStore, vault.fragment, [day]);
    await typeName();
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
