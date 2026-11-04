import { describe, expect, it } from 'vitest';
import { newInvitation } from '../../domain/vault/invitation';
import { readVaultObject } from '../../domain/vault/vaultObject';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import { VaultError, createVault, openSession, vaultStoreOf, writeSession } from '../deviceVault';
import {
  approveInvitation,
  checkAsNewDevice,
  checkAsOwner,
  finishJoin,
  startInvitation,
  startJoin,
} from '../invitationFlow';
import type { JoinState, OwnerInvitation } from '../invitationFlow';
import type { DeviceRecord } from '../keyStore';
import type { RelayClient } from '../relayClient';

const days = [
  { date: '2026-10-01', day: { bleeding: 'H' }, clock: { time: 5, counter: 0, member: 'm' } },
] as never;

const setup = async () => {
  const harness = createRelayHarness();
  const ownerStore = createMemoryKeyStore();
  const { record } = await createVault(harness.relay, ownerStore);
  const owner = vaultStoreOf(harness.relay, ownerStore, record);
  const first = await owner.read();
  await owner.write(days, first?.etag ?? null);
  return { ...harness, ownerStore, ownerRecord: (await ownerStore.load()) as DeviceRecord };
};

const reasonOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof VaultError) return { reason: error.reason, ...error.detail };
    throw error;
  }
  throw new Error('No error');
};

/** Runs the invitation until both devices show the code. */
const untilCodes = async (
  relay: RelayClient,
  ownerRecord: DeviceRecord,
  owner: OwnerInvitation,
  join: JoinState
) => {
  expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'waiting' });
  const atNewDevice = await checkAsNewDevice(relay, join);
  const atOwner = await checkAsOwner(relay, ownerRecord, owner);
  if (atNewDevice.status !== 'confirm' || atOwner.status !== 'confirm') throw new Error('No code');
  return { atNewDevice, atOwner };
};

describe('invitation flow', () => {
  it('adds a reader that reads the days and cannot write', async () => {
    const { relay, ownerStore, ownerRecord, objects } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation);
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'waiting' });
    const { atNewDevice, atOwner } = await untilCodes(relay, ownerRecord, owner, join);
    expect(atNewDevice.code).toMatch(/^\d{6}$/);
    expect(atOwner.code).toBe(atNewDevice.code);
    // The new device shows the code again before the answer
    expect(await checkAsNewDevice(relay, join)).toMatchObject({ status: 'confirm' });

    const ownerNext = await approveInvitation(
      relay,
      ownerStore,
      ownerRecord,
      owner,
      atOwner.request
    );
    expect(ownerNext.last?.counter).toBe(3);
    const answered = await checkAsNewDevice(relay, join);
    if (answered.status !== 'answered') throw new Error(answered.status);
    expect(answered.content).toMatchObject({ role: 'reader', counter: 3 });

    const newStore = createMemoryKeyStore();
    const record = await finishJoin(relay, newStore, join, answered.offer, answered.content);
    expect(record).toMatchObject({ vaultId: ownerRecord.vaultId, role: 'reader' });
    expect(await newStore.load()).toEqual(record);
    expect(objects.has(`invites/${owner.invitation.id}`)).toBe(false);
    const store = vaultStoreOf(relay, newStore, record);
    const read = await store.read();
    expect(read?.days).toEqual(days);
    expect(await reasonOf(store.write([], read?.etag ?? null))).toEqual({ reason: 'reader' });
    // The reader entry has no signing key and no lookup copy
    const { header } = readVaultObject(
      objects.get(`vaults/${ownerRecord.vaultId}`)?.value as string
    ) as never as { header: { keyring: { id: string; signingKey?: unknown; lookup?: unknown }[] } };
    const entry = header.keyring.find(m => m.id === record.memberId);
    expect(entry?.signingKey).toBeUndefined();
    expect(entry?.lookup).toBeUndefined();
  });

  it('adds an owner device that writes, and that can invite in turn', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'owner');
    const join = await startJoin(relay, owner.invitation);
    const { atOwner } = await untilCodes(relay, ownerRecord, owner, join);
    await approveInvitation(relay, ownerStore, ownerRecord, owner, atOwner.request);
    const answered = await checkAsNewDevice(relay, join);
    if (answered.status !== 'answered') throw new Error(answered.status);
    const newStore = createMemoryKeyStore();
    const record = await finishJoin(relay, newStore, join, answered.offer, answered.content);
    const store = vaultStoreOf(relay, newStore, record);
    const read = await store.read();
    expect(await store.write([], read?.etag ?? null)).toEqual(expect.any(String));
    const session = await openSession(relay, newStore, (await newStore.load()) as DeviceRecord);
    expect(session.entry.lookup).toBeDefined();
    expect((await startInvitation(relay, session.record, 'reader')).role).toBe('reader');
  });

  it('adds an owner without a lookup copy when the inviting owner has none', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const session = await openSession(relay, ownerStore, ownerRecord);
    const keyring = session.header.keyring.map(({ lookup: _lookup, ...m }) => m);
    const written = await writeSession(relay, ownerStore, session, { keyring });
    const record = written?.record as DeviceRecord;
    const owner = await startInvitation(relay, record, 'owner');
    const join = await startJoin(relay, owner.invitation);
    const { atOwner } = await untilCodes(relay, record, owner, join);
    await approveInvitation(relay, ownerStore, record, owner, atOwner.request);
    const answered = await checkAsNewDevice(relay, join);
    if (answered.status !== 'answered') throw new Error(answered.status);
    const newStore = createMemoryKeyStore();
    const joined = await finishJoin(relay, newStore, join, answered.offer, answered.content);
    const newSession = await openSession(relay, newStore, joined);
    expect(newSession.entry.role).toBe('owner');
    expect(newSession.entry.signingKey).toBeDefined();
    expect(newSession.entry.lookup).toBeUndefined();
  });

  it('refuses a join request without the secret, and deletes the invitation', async () => {
    const { relay, ownerRecord, objects } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'reader');
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'waiting' });
    await startJoin(relay, { ...owner.invitation, secret: newInvitation().secret });
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'refused' });
    expect(objects.has(`invites/${owner.invitation.id}`)).toBe(false);
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'expired' });
  });

  it('refuses a reveal that is not the nonce of the request', async () => {
    const { relay, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation);
    await checkAsOwner(relay, ownerRecord, owner);
    // The offer is sent, and the reveal is not there yet
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'waiting' });
    await relay.postInvite(owner.invitation.id, 'reveal', { nonce: 'other' }, join.token);
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'refused' });
  });

  it('refuses an offer or an answer that is not valid on the new device', async () => {
    const { relay, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation);
    await relay.postInvite(owner.invitation.id, 'offer', { nonce: 7 }, ownerRecord.token);
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'refused' });
    // A valid offer, then an answer that is not signed
    const second = await startInvitation(relay, ownerRecord, 'reader');
    const other = await startJoin(relay, second.invitation);
    await untilCodes(relay, ownerRecord, second, other);
    await relay.postInvite(
      second.invitation.id,
      'answer',
      { content: '{}', signature: 'AA' },
      ownerRecord.token
    );
    expect(await checkAsNewDevice(relay, other)).toEqual({ status: 'refused' });
    // The owner device refuses an offer that is not valid
    const third = await startInvitation(relay, ownerRecord, 'reader');
    const joinThird = await startJoin(relay, third.invitation);
    await relay.postInvite(third.invitation.id, 'offer', { nonce: 7 }, ownerRecord.token);
    await relay.postInvite(
      third.invitation.id,
      'reveal',
      { nonce: joinThird.nonce },
      joinThird.token
    );
    expect(await checkAsOwner(relay, ownerRecord, third)).toEqual({ status: 'refused' });
  });

  it('gives expired on the new device, and a reader error when a reader invites', async () => {
    const { relay, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation);
    await relay.deleteInvite(owner.invitation.id, ownerRecord.token);
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'expired' });
    expect(
      await reasonOf(startInvitation(relay, { ...ownerRecord, role: 'reader' }, 'reader'))
    ).toEqual({ reason: 'reader' });
  });

  it('gives a relay error when the relay fails', async () => {
    const { relay, ownerRecord, env } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation);
    // The request was sent already
    expect(await reasonOf(startJoin(relay, owner.invitation))).toMatchObject({
      reason: 'relay',
      status: 409,
    });
    env.VAULTS = undefined;
    expect(await reasonOf(startInvitation(relay, ownerRecord, 'reader'))).toMatchObject({
      reason: 'relay',
      status: 503,
    });
    expect(await reasonOf(checkAsOwner(relay, ownerRecord, owner))).toMatchObject({
      reason: 'relay',
      status: 503,
    });
    expect(await reasonOf(checkAsNewDevice(relay, join))).toMatchObject({
      reason: 'relay',
      status: 503,
    });
  });

  it('gives a relay error when the vault changed before the approval writes', async () => {
    const { relay, ownerStore, ownerRecord, bucket } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation);
    const { atOwner } = await untilCodes(relay, ownerRecord, owner, join);
    const put = bucket.put.bind(bucket);
    bucket.put = async (key, value, options) => {
      if (key.startsWith('vaults/')) await put(key, value);
      return put(key, value, options);
    };
    expect(
      await reasonOf(approveInvitation(relay, ownerStore, ownerRecord, owner, atOwner.request))
    ).toEqual({ reason: 'relay', status: 412, error: 'changed' });
  });

  it('refuses a new member with a public key that is not valid', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation);
    const { atOwner } = await untilCodes(relay, ownerRecord, owner, join);
    expect(
      await reasonOf(
        approveInvitation(relay, ownerStore, ownerRecord, owner, {
          ...atOwner.request,
          publicKey: 'AA',
        })
      )
    ).toEqual({ reason: 'keys' });
  });

  it('reads messages that are not an object as no message', async () => {
    const relay = {
      getInvite: async () => ({ ok: true, status: 200, text: '[]', etag: 'e' }),
    } as unknown as RelayClient;
    const join = { invitation: newInvitation(), token: 't' } as JoinState;
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'waiting' });
  });
});
