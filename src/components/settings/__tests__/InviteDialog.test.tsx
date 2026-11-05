import { qrMatrix } from '../qrMatrix';
import { act, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { en } from '../../../i18n';
import { buildDemoObservations } from '../../../domain/demoData';
import { createVault } from '../../../sync/deviceVault';
import { randomBytes, toBase64Url } from '../../../domain/vault/bytes';
import { makeJoinRequest, newInvitation } from '../../../domain/vault/invitation';
import type { RelayClient } from '../../../sync/relayClient';
import { makeObservation } from '../../../test/factories';
import { createMemoryKeyStore, createRelayHarness } from '../../../test/relayHarness';
import { renderWithProviders } from '../../../test/render';
import { controlOf } from '../../../test/syncControl';
import type { Observation } from '../../../types/crms';
import { STORAGE_OBSERVATIONS_KEY } from '../../../utils/storageKeys';
import { JoinDialog } from '../../JoinDialog';
import { InviteDialog } from '../InviteDialog';

const s = en.sync;
const POLL = 10;

const owner = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  const made = await createVault(harness.relay, keyStore, 'Phone');
  return { ...harness, keyStore, record: made.record };
};

const inviteKeys = (objects: Map<string, unknown>) =>
  [...objects.keys()].filter(key => key.startsWith('invites/'));

const renderInvite = (
  relay: RelayClient,
  keyStore = createMemoryKeyStore(),
  role: 'owner' | 'reader' = 'owner'
) => {
  const onClose = vi.fn();
  const control = controlOf(relay, keyStore);
  const view = renderWithProviders(
    <InviteDialog control={control} invitedRole={role} onClose={onClose} pollMs={POLL} />
  );
  return { onClose, control, ...view };
};

/** Types the name of the new device in the join dialog and continues. */
const typeJoinName = async (name = 'Tablet') => {
  const join = await screen.findByRole('dialog', { name: s.joinTitle });
  fireEvent.change(await within(join).findByLabelText(s.nameLabel), { target: { value: name } });
  fireEvent.click(within(join).getByRole('button', { name: s.nameContinue }));
};
const inviteDialog = () => screen.findByRole('dialog', { name: s.inviteTitle });
const linkOf = async () =>
  ((await screen.findByRole('textbox', { name: s.inviteLinkLabel })) as HTMLInputElement).value;
const codeIn = (dialog: HTMLElement) =>
  within(dialog).getByText(/^\d{3} \d{3}$/).textContent as string;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InviteDialog and JoinDialog', () => {
  it('add a device when both users confirm the same code, the new device first', async () => {
    const own = await owner();
    const newStore = createMemoryKeyStore();
    const { control } = renderInvite(own.relay, own.keyStore);
    const link = await linkOf();
    expect(link).toMatch(/^http:\/\/localhost:\d+\/#invite=[\w-]+\.[\w-]+$/);
    expect(await inviteDialog()).toHaveTextContent(s.inviteLink);

    const joinControl = controlOf(own.relay, newStore);
    const own2 = makeObservation({ date: '2026-10-01', bleeding: 'H' });
    localStorage.setItem(
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify([...buildDemoObservations('2026-10-20'), own2])
    );
    renderWithProviders(
      <JoinDialog
        control={joinControl}
        fragment={link.slice(link.indexOf('#'))}
        onClose={vi.fn()}
        pollMs={POLL}
      />,
      { observations: [...buildDemoObservations('2026-10-20'), own2] }
    );
    await typeJoinName();
    const join = await screen.findByRole('dialog', { name: s.joinTitle });
    expect(within(join).getByRole('status')).toHaveTextContent(s.joinWaiting);

    const invite = await inviteDialog();
    await within(invite).findByText(s.inviteConfirm);
    expect(invite).toHaveTextContent('New device: Tablet');
    await within(join).findByText(s.joinConfirm);
    expect(codeIn(invite)).toBe(codeIn(join));

    // The new device confirms first: it waits for the answer, and can still cancel
    fireEvent.click(within(join).getByRole('button', { name: s.codesMatch }));
    expect(within(join).getByRole('status')).toHaveTextContent(s.working);
    expect(within(join).getByRole('button', { name: en.actions.cancel })).toBeInTheDocument();
    expect(await newStore.load()).toBeNull();

    fireEvent.click(within(invite).getByRole('button', { name: s.codesMatch }));
    expect(await within(invite).findByText(s.inviteDone)).toBeInTheDocument();
    expect(control.syncNow).toHaveBeenCalledTimes(1);
    expect(await within(join).findByText(s.joinDone)).toBeInTheDocument();
    expect(joinControl.syncNow).toHaveBeenCalledTimes(1);
    expect(await newStore.load()).toMatchObject({ vaultId: own.record.vaultId, role: 'owner' });
    expect(inviteKeys(own.objects)).toEqual([]);
    // The demo days go before the join
    const stored = JSON.parse(localStorage.getItem(STORAGE_OBSERVATIONS_KEY) as string);
    expect(stored.map((o: Observation) => o.date)).toEqual(['2026-10-01']);
  });

  it('adds a partner as a reader, with the title and the end of the partner', async () => {
    const own = await owner();
    const newStore = createMemoryKeyStore();
    renderInvite(own.relay, own.keyStore, 'reader');
    const invite = await screen.findByRole('dialog', { name: s.invitePartner });
    const link = await linkOf();
    renderWithProviders(
      <JoinDialog
        control={controlOf(own.relay, newStore)}
        fragment={link.slice(link.indexOf('#'))}
        onClose={vi.fn()}
        pollMs={POLL}
      />
    );
    await typeJoinName('Phone of Sam');
    await within(invite).findByText(s.inviteConfirm);
    expect(invite).toHaveTextContent('New device: Phone of Sam');
    fireEvent.click(within(invite).getByRole('button', { name: s.codesMatch }));
    expect(await within(invite).findByText(s.invitePartnerDone)).toBeInTheDocument();
    const join = await screen.findByRole('dialog', { name: s.joinTitle });
    fireEvent.click(await within(join).findByRole('button', { name: s.codesMatch }));
    await within(join).findByText(s.joinDone);
    expect(await newStore.load()).toMatchObject({ vaultId: own.record.vaultId, role: 'reader' });
  });

  it('shows the title of the partner at the end of a failed invitation', async () => {
    const own = await owner();
    renderInvite(own.relay, createMemoryKeyStore(), 'reader');
    const invite = await screen.findByRole('dialog', { name: s.invitePartner });
    expect(await within(invite).findByRole('alert')).toBeInTheDocument();
    expect(within(invite).getByRole('status')).toHaveTextContent(s.invitePartner);
  });

  it('add a device when the owner confirms first', async () => {
    const own = await owner();
    const newStore = createMemoryKeyStore();
    renderInvite(own.relay, own.keyStore);
    const link = await linkOf();
    // The new device sees the answer before its user confirms
    let answerSeen = false;
    const joinRelay: RelayClient = {
      ...own.relay,
      getInvite: async (...args) => {
        const result = await own.relay.getInvite(...args);
        if (result.ok && result.text.includes('"answer"')) answerSeen = true;
        return result;
      },
    };
    renderWithProviders(
      <JoinDialog
        control={controlOf(joinRelay, newStore)}
        fragment={link.slice(link.indexOf('#'))}
        onClose={vi.fn()}
        pollMs={POLL}
      />
    );
    await typeJoinName();
    const invite = await inviteDialog();
    fireEvent.click(await within(invite).findByRole('button', { name: s.codesMatch }));
    await within(invite).findByText(s.inviteDone);
    const join = await screen.findByRole('dialog', { name: s.joinTitle });
    await waitFor(() => expect(answerSeen).toBe(true));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, POLL * 3));
    });
    // The answer came, but the device uses it only after its user confirmed
    expect(await newStore.load()).toBeNull();
    expect(within(join).getByRole('status')).toHaveTextContent(s.joinConfirm);
    fireEvent.click(await within(join).findByRole('button', { name: s.codesMatch }));
    expect(await within(join).findByText(s.joinDone)).toBeInTheDocument();
    expect(await newStore.load()).not.toBeNull();
    fireEvent.click(within(join).getByRole('button', { name: s.close }));
  });
});

describe('InviteDialog', () => {
  it('shows the QR code of the link while it waits', async () => {
    const own = await owner();
    renderInvite(own.relay, own.keyStore);
    const link = await linkOf();
    const qr = within(await inviteDialog()).getByRole('img', { name: s.inviteQrLabel });
    // The code of the link, with a quiet zone of 4 modules
    const size = (qrMatrix(link) as boolean[][]).length + 8;
    expect(qr.getAttribute('viewBox')).toBe(`0 0 ${size} ${size}`);
  });

  it('copies the link', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const own = await owner();
    renderInvite(own.relay, own.keyStore);
    const link = await linkOf();
    const invite = await inviteDialog();
    const field = within(invite).getByRole('textbox', { name: s.inviteLinkLabel });
    fireEvent.focus(field);
    expect((field as HTMLInputElement).selectionEnd).toBe(link.length);
    fireEvent.click(within(invite).getByRole('button', { name: s.copy }));
    expect(await within(invite).findByRole('button', { name: s.copied })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(link);
  });

  it('keeps Copy when the clipboard refuses the link or does not exist', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied');
    });
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const own = await owner();
    renderInvite(own.relay, own.keyStore);
    await linkOf();
    const invite = await inviteDialog();
    fireEvent.click(within(invite).getByRole('button', { name: s.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    fireEvent.click(within(invite).getByRole('button', { name: s.copy }));
    expect(within(invite).getByRole('button', { name: s.copy })).toBeInTheDocument();
  });

  it('deletes the invitation on Cancel and on Escape', async () => {
    const own = await owner();
    const first = renderInvite(own.relay, own.keyStore);
    await linkOf();
    expect(inviteKeys(own.objects)).toHaveLength(1);
    fireEvent.click(within(await inviteDialog()).getByRole('button', { name: en.actions.cancel }));
    expect(first.onClose).toHaveBeenCalled();
    await waitFor(() => expect(inviteKeys(own.objects)).toHaveLength(0));
    first.unmount();

    const second = renderInvite(own.relay, own.keyStore);
    await linkOf();
    fireEvent.keyDown(await inviteDialog(), { key: 'Escape' });
    expect(second.onClose).toHaveBeenCalled();
    await waitFor(() => expect(inviteKeys(own.objects)).toHaveLength(0));
  });

  it('deletes the invitation when the dialog goes away, also while it starts', async () => {
    const own = await owner();
    const first = renderInvite(own.relay, own.keyStore);
    await linkOf();
    first.unmount();
    await waitFor(() => expect(inviteKeys(own.objects)).toHaveLength(0));
    // A check that fails after the close changes nothing
    const third = renderInvite(own.relay, own.keyStore);
    await linkOf();
    own.failWhen(request => request.method === 'GET');
    third.unmount();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, POLL * 5));
    });
    own.failWhen(null);

    let release: () => void = () => {};
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    const relay: RelayClient = {
      ...own.relay,
      putInvite: async (...args) => {
        await blocked;
        return own.relay.putInvite(...args);
      },
    };
    const second = renderInvite(relay, own.keyStore);
    const invite = await inviteDialog();
    expect(within(invite).getByRole('status')).toHaveTextContent(s.working);
    fireEvent.click(within(invite).getByRole('button', { name: en.actions.cancel }));
    second.unmount();
    await act(async () => release());
    await waitFor(() => expect(own.objects.size).toBeGreaterThan(0));
    await waitFor(() => expect(inviteKeys(own.objects)).toHaveLength(0));
  });

  it('deletes the invitation when the codes do not match', async () => {
    const own = await owner();
    const { onClose } = renderInvite(own.relay, own.keyStore);
    const link = await linkOf();
    renderWithProviders(
      <JoinDialog
        control={controlOf(own.relay, createMemoryKeyStore())}
        fragment={link.slice(link.indexOf('#'))}
        onClose={vi.fn()}
        pollMs={POLL}
      />
    );
    await typeJoinName();
    const invite = await inviteDialog();
    fireEvent.click(await within(invite).findByRole('button', { name: s.codesDiffer }));
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(inviteKeys(own.objects)).toHaveLength(0));
    // The new device then finds no invitation
    const join = await screen.findByRole('dialog', { name: s.joinTitle });
    expect(await within(join).findByRole('alert')).toHaveTextContent(s.expired);
  });

  it('ends when the invitation expired, or when a message is not valid', async () => {
    const own = await owner();
    const first = renderInvite(own.relay, own.keyStore);
    await linkOf();
    own.objects.delete(inviteKeys(own.objects)[0] as string);
    expect(await within(await inviteDialog()).findByRole('alert')).toHaveTextContent(s.expired);
    fireEvent.click(within(await inviteDialog()).getByRole('button', { name: s.close }));
    expect(first.onClose).toHaveBeenCalled();
    first.unmount();

    renderInvite(own.relay, own.keyStore);
    const link = await linkOf();
    const id = link.slice(link.indexOf('=') + 1, link.lastIndexOf('.'));
    // A request with the HMAC of another secret
    const wrong = { id, secret: newInvitation().secret };
    const { request } = await makeJoinRequest(
      wrong,
      toBase64Url(randomBytes(65)),
      toBase64Url(randomBytes(32)),
      'Tablet'
    );
    expect((await own.relay.postInvite(id, 'request', request)).ok).toBe(true);
    expect(await within(await inviteDialog()).findByRole('alert')).toHaveTextContent(s.refused);
  });

  it('shows a lost connection while it waits, and checks again', async () => {
    const own = await owner();
    renderInvite(own.relay, own.keyStore);
    await linkOf();
    const invite = await inviteDialog();
    own.failWhen(request => request.method === 'GET');
    expect(await within(invite).findByRole('alert')).toHaveTextContent(s.noConnection);
    own.failWhen(null);
    await waitFor(() => expect(within(invite).queryByRole('alert')).toBeNull());
    expect(within(invite).getByRole('status')).toHaveTextContent(s.inviteLink);
  });

  it('waits while the relay is not available, and ends on another relay error', async () => {
    const own = await owner();
    let status = 503;
    const relay: RelayClient = {
      ...own.relay,
      getInvite: async () => ({ ok: false, status, error: 'x' }),
    };
    renderInvite(relay, own.keyStore);
    await linkOf();
    const invite = await inviteDialog();
    expect(await within(invite).findByRole('alert')).toHaveTextContent(s.unavailable);
    status = 500;
    await waitFor(() => expect(within(invite).getByRole('alert')).toHaveTextContent(s.failed));
    expect(within(invite).getByRole('button', { name: s.close })).toBeInTheDocument();
    await waitFor(() => expect(inviteKeys(own.objects)).toHaveLength(0));
  });

  it('makes one invitation in StrictMode and stays open', async () => {
    configure({ reactStrictMode: true });
    onTestFinished(() => configure({ reactStrictMode: false }));
    const own = await owner();
    const putInvite = vi.spyOn(own.relay, 'putInvite');
    const onClose = vi.fn();
    renderWithProviders(
      <InviteDialog
        control={controlOf(own.relay, own.keyStore)}
        invitedRole="owner"
        onClose={onClose}
        pollMs={POLL}
      />
    );
    await linkOf();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, POLL * 3));
    });
    expect(putInvite).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(inviteKeys(own.objects)).toHaveLength(1);
  });

  it('gives the cause of a failure', async () => {
    renderInvite(createRelayHarness().relay, createMemoryKeyStore());
    expect(await within(await inviteDialog()).findByRole('alert')).toHaveTextContent(s.failed);
  });

  it('does not close while it adds the member, and gives the cause of a failed add', async () => {
    const own = await owner();
    let release: () => void = () => {};
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    let block = false;
    const relay: RelayClient = {
      ...own.relay,
      putVault: async () => {
        if (block) await blocked;
        return { ok: false, status: 0, error: 'network' };
      },
    };
    const { onClose } = renderInvite(relay, own.keyStore);
    const link = await linkOf();
    renderWithProviders(
      <JoinDialog
        control={controlOf(own.relay, createMemoryKeyStore())}
        fragment={link.slice(link.indexOf('#'))}
        onClose={vi.fn()}
        pollMs={POLL}
      />
    );
    await typeJoinName();
    const invite = await inviteDialog();
    block = true;
    fireEvent.click(await within(invite).findByRole('button', { name: s.codesMatch }));
    expect(within(invite).getByRole('status')).toHaveTextContent(s.working);
    expect(within(invite).queryByRole('button')).toBeNull();
    fireEvent.keyDown(invite, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => release());
    expect(await within(invite).findByRole('alert')).toHaveTextContent(s.noConnection);
    // The invitation stays: the owner can try again
    block = false;
    fireEvent.click(within(invite).getByRole('button', { name: s.codesMatch }));
    expect(await within(invite).findByRole('alert')).toHaveTextContent(s.noConnection);
    expect(inviteKeys(own.objects)).toHaveLength(1);
  });
});
