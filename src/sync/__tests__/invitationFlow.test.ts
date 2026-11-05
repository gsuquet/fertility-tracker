import { describe, expect, it } from 'vitest';
import { sha256, toBase64Url, utf8 } from '../../domain/vault/bytes';
import { makeJoinRequest, newInvitation } from '../../domain/vault/invitation';
import { readVaultObject } from '../../domain/vault/vaultObject';
import type { VaultHeader } from '../../domain/vault/vaultObject';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import {
  VaultError,
  createVault,
  memberNames,
  openSession,
  vaultStoreOf,
  writeSession,
} from '../deviceVault';
import {
  approveInvitation,
  checkAsNewDevice,
  checkAsOwner,
  finishJoin,
  startInvitation,
  startJoin,
} from '../invitationFlow';
import type { JoinState, OwnerInvitation } from '../invitationFlow';
import type { DeviceRecord, KeyStore } from '../keyStore';
import type { RelayClient } from '../relayClient';

const days = [
  { date: '2026-10-01', day: { bleeding: 'H' }, clock: { time: 5, counter: 0, member: 'm' } },
] as never;

const setup = async () => {
  const harness = createRelayHarness();
  const ownerStore = createMemoryKeyStore();
  const { record } = await createVault(harness.relay, ownerStore, 'Phone');
  const owner = vaultStoreOf(harness.relay, ownerStore, record);
  const first = await owner.read();
  await owner.write(days, first?.etag ?? null);
  const headerOf = () =>
    (
      readVaultObject(harness.objects.get(`vaults/${record.vaultId}`)?.value as string) as {
        header: VaultHeader;
      }
    ).header;
  return {
    ...harness,
    ownerStore,
    ownerRecord: (await ownerStore.load()) as DeviceRecord,
    headerOf,
  };
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

/** Runs the whole invitation, and gives the record of the new device. */
const joined = async (
  relay: RelayClient,
  ownerStore: KeyStore,
  ownerRecord: DeviceRecord,
  role: 'owner' | 'reader'
) => {
  const owner = await startInvitation(relay, ownerStore, ownerRecord, role);
  const join = await startJoin(relay, owner.invitation, 'Tablet');
  await untilCodes(relay, ownerRecord, owner, join);
  await approveInvitation(relay, ownerStore, ownerRecord, owner);
  const answered = await checkAsNewDevice(relay, join);
  if (answered.status !== 'answered') throw new Error(answered.status);
  const newStore = createMemoryKeyStore();
  const record = await finishJoin(relay, newStore, join, answered.offer, answered.content);
  return { record, newStore, owner, answered };
};

describe('invitation flow', () => {
  it('adds a reader that reads the days, and cannot write or invite', async () => {
    const { relay, ownerStore, ownerRecord, objects, headerOf } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    expect(owner.offer.signingPublicKey).toBe(ownerRecord.trustedSigningKey);
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'waiting' });
    const { atNewDevice, atOwner } = await untilCodes(relay, ownerRecord, owner, join);
    expect(atNewDevice.code).toMatch(/^\d{6}$/);
    expect(atOwner.code).toBe(atNewDevice.code);
    // The new device shows the code again before the answer
    expect(await checkAsNewDevice(relay, join)).toMatchObject({ status: 'confirm' });

    const ownerNext = await approveInvitation(relay, ownerStore, ownerRecord, owner);
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
    expect(await reasonOf(startInvitation(relay, newStore, record, 'reader'))).toEqual({
      reason: 'reader',
    });
    // The reader entry has no signing key and no lookup copy
    const entry = headerOf().keyring.find(m => m.id === record.memberId);
    expect(entry?.signingKey).toBeUndefined();
    expect(entry?.lookup).toBeUndefined();
  });

  it('gives the name of the new device to the owner, and keeps it encrypted in the keyring', async () => {
    const { relay, ownerStore, ownerRecord, headerOf, objects } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet of Sam');
    // The relay does not see the name
    expect(objects.get(`invites/${owner.invitation.id}`)?.value).not.toContain('Tablet of Sam');
    const { atOwner } = await untilCodes(relay, ownerRecord, owner, join);
    expect(atOwner.name).toBe('Tablet of Sam');
    await approveInvitation(relay, ownerStore, ownerRecord, owner);
    expect(JSON.stringify(headerOf())).not.toContain('Tablet of Sam');
    const answered = await checkAsNewDevice(relay, join);
    if (answered.status !== 'answered') throw new Error(answered.status);
    const readerStore = createMemoryKeyStore();
    const record = await finishJoin(relay, readerStore, join, answered.offer, answered.content);
    const expected = [
      { id: ownerRecord.memberId, role: 'owner', name: 'Phone' },
      { id: expect.any(String), role: 'owner', name: null },
      { id: record.memberId, role: 'reader', name: 'Tablet of Sam' },
    ];
    const ownerSession = await openSession(relay, ownerStore, (await ownerStore.load()) as never);
    expect(await memberNames(ownerSession)).toEqual(expected);
    // A reader has the data key, so it reads the names too
    expect(await memberNames(await openSession(relay, readerStore, record))).toEqual(expected);
  });

  it('adds an owner device that writes, and that can invite in turn', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const { record, newStore } = await joined(relay, ownerStore, ownerRecord, 'owner');
    const store = vaultStoreOf(relay, newStore, record);
    const read = await store.read();
    expect(await store.write([], read?.etag ?? null)).toEqual(expect.any(String));
    const session = await openSession(relay, newStore, (await newStore.load()) as DeviceRecord);
    expect(session.entry.lookup).toBeDefined();
    const next = await startInvitation(relay, newStore, session.record, 'reader');
    expect(next.role).toBe('reader');
  });

  it('adds an owner without a lookup copy when the inviting owner has none', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const session = await openSession(relay, ownerStore, ownerRecord);
    const keyring = session.header.keyring.map(({ lookup: _lookup, ...m }) => m);
    const written = await writeSession(relay, ownerStore, session, { keyring });
    const { record } = await joined(relay, ownerStore, written?.record as DeviceRecord, 'owner');
    const newSession = await openSession(relay, createMemoryKeyStore(), record);
    expect(newSession.entry.role).toBe('owner');
    expect(newSession.entry.signingKey).toBeDefined();
    expect(newSession.entry.lookup).toBeUndefined();
  });

  it('refuses a join request without the secret, and deletes the invitation', async () => {
    const { relay, ownerStore, ownerRecord, objects } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'waiting' });
    await startJoin(relay, { ...owner.invitation, secret: newInvitation().secret }, 'Tablet');
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'refused' });
    expect(objects.has(`invites/${owner.invitation.id}`)).toBe(false);
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'expired' });
  });

  it('refuses a reveal that is not the nonce of the request', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    await checkAsOwner(relay, ownerRecord, owner);
    // The offer is sent, and the reveal is not there yet
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'waiting' });
    await relay.postInvite(owner.invitation.id, 'reveal', { nonce: 'other' }, join.token);
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'refused' });
  });

  it('refuses an offer that is not the offer of the owner device', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    // A relay that gives its own offer, with its own signing key, to the two devices
    const offer = { ...owner.offer, signingPublicKey: toBase64Url(new Uint8Array(65)) };
    await relay.postInvite(owner.invitation.id, 'offer', offer, ownerRecord.token);
    expect(await checkAsNewDevice(relay, join)).toMatchObject({ status: 'confirm' });
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'refused' });
  });

  it('refuses a request or an offer that the relay changes after the first one', async () => {
    const { relay, ownerStore, ownerRecord, objects } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    await untilCodes(relay, ownerRecord, owner, join);
    const key = `invites/${owner.invitation.id}`;
    const change = (field: 'request' | 'offer', value: Record<string, unknown>) => {
      const stored = objects.get(key);
      if (!stored) throw new Error('No invitation');
      const messages = JSON.parse(stored.value);
      messages[field] = { ...messages[field], ...value };
      objects.set(key, { ...stored, value: JSON.stringify(messages) });
    };
    // The new device keeps the first offer
    change('offer', { nonce: 'other' });
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'refused' });
    // The owner device keeps the first request, also a new request with a valid HMAC
    const other = await makeJoinRequest(owner.invitation, join.publicKey, 'AA', 'Tablet');
    change('request', other.request as never);
    expect(await checkAsOwner(relay, ownerRecord, owner)).toEqual({ status: 'refused' });
  });

  it('refuses an offer on the relay when the owner device kept no request', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    await startJoin(relay, owner.invitation, 'Tablet');
    await checkAsOwner(relay, ownerRecord, owner);
    const { request: _request, ...lost } = owner;
    expect(await checkAsOwner(relay, ownerRecord, lost)).toEqual({ status: 'refused' });
  });

  it('refuses an offer or an answer that is not valid on the new device', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    await relay.postInvite(owner.invitation.id, 'offer', { nonce: 7 }, ownerRecord.token);
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'refused' });
    const second = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const other = await startJoin(relay, second.invitation, 'Tablet');
    await untilCodes(relay, ownerRecord, second, other);
    const answer = { content: '{}', signature: 'AA' };
    await relay.postInvite(second.invitation.id, 'answer', answer, ownerRecord.token);
    expect(await checkAsNewDevice(relay, other)).toEqual({ status: 'refused' });
  });

  it('approves only a confirmed invitation, and keeps the same member on a second call', async () => {
    const { relay, ownerStore, ownerRecord, headerOf, failWhen } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    expect(await reasonOf(approveInvitation(relay, ownerStore, ownerRecord, owner))).toEqual({
      reason: 'invitation',
      error: 'waiting',
    });
    await untilCodes(relay, ownerRecord, owner, join);
    failWhen(request => request.url.endsWith('/answer'));
    expect(await reasonOf(approveInvitation(relay, ownerStore, ownerRecord, owner))).toMatchObject({
      reason: 'relay',
      status: 0,
    });
    failWhen(null);
    const size = headerOf().keyring.length;
    const record = (await ownerStore.load()) as DeviceRecord;
    // The member is in the keyring already: a different role is refused
    expect(
      await reasonOf(approveInvitation(relay, ownerStore, record, { ...owner, role: 'owner' }))
    ).toEqual({ reason: 'invitation', error: 'member' });
    await approveInvitation(relay, ownerStore, record, owner);
    expect(headerOf().keyring).toHaveLength(size);
    const answered = await checkAsNewDevice(relay, join);
    expect(answered).toMatchObject({ status: 'answered', content: { counter: 3 } });
  });

  it('refuses a member in the keyring with the same public key and a different token', async () => {
    const { relay, ownerStore, ownerRecord, headerOf } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const own = headerOf().keyring.find(m => m.id === ownerRecord.memberId);
    // A join request with the public key of the owner device and a different token
    const tokenHash = toBase64Url(await sha256(utf8('other')));
    const { request, nonce } = await makeJoinRequest(
      owner.invitation,
      own?.publicKey as string,
      tokenHash,
      'Tablet'
    );
    await relay.postInvite(owner.invitation.id, 'request', request);
    await checkAsOwner(relay, ownerRecord, owner);
    await relay.postInvite(owner.invitation.id, 'reveal', { nonce }, 'other');
    expect(await reasonOf(approveInvitation(relay, ownerStore, ownerRecord, owner))).toEqual({
      reason: 'invitation',
      error: 'member',
    });
  });

  it('refuses a new member with a public key that is not valid', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const tokenHash = toBase64Url(await sha256(utf8('joiner')));
    const { request, nonce } = await makeJoinRequest(owner.invitation, 'AA', tokenHash, 'Tablet');
    await relay.postInvite(owner.invitation.id, 'request', request);
    await checkAsOwner(relay, ownerRecord, owner);
    await relay.postInvite(owner.invitation.id, 'reveal', { nonce }, 'joiner');
    expect(await reasonOf(approveInvitation(relay, ownerStore, ownerRecord, owner))).toEqual({
      reason: 'keys',
    });
  });

  it('gives expired on the new device', async () => {
    const { relay, ownerStore, ownerRecord } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    await relay.deleteInvite(owner.invitation.id, ownerRecord.token);
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'expired' });
  });

  it('gives a relay error when the relay fails', async () => {
    const { relay, ownerStore, ownerRecord, env, failWhen } = await setup();
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    // The request was sent already
    expect(await reasonOf(startJoin(relay, owner.invitation, 'Tablet'))).toMatchObject({
      reason: 'relay',
      status: 409,
    });
    failWhen(request => request.method === 'PUT' && request.url.includes('/invites/'));
    expect(await reasonOf(startInvitation(relay, ownerStore, ownerRecord, 'reader'))).toMatchObject(
      { reason: 'relay', status: 0 }
    );
    failWhen(null);
    env.VAULTS = undefined;
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
    const owner = await startInvitation(relay, ownerStore, ownerRecord, 'reader');
    const join = await startJoin(relay, owner.invitation, 'Tablet');
    await untilCodes(relay, ownerRecord, owner, join);
    const put = bucket.put.bind(bucket);
    bucket.put = async (key, value, options) => {
      if (key.startsWith('vaults/')) await put(key, value);
      return put(key, value, options);
    };
    expect(await reasonOf(approveInvitation(relay, ownerStore, ownerRecord, owner))).toEqual({
      reason: 'relay',
      status: 412,
      error: 'changed',
    });
  });

  it('reads messages that are not an object as no message', async () => {
    const relay = {
      getInvite: async () => ({ ok: true, status: 200, text: '[]', etag: 'e' }),
    } as unknown as RelayClient;
    const join = { invitation: newInvitation(), token: 't' } as JoinState;
    expect(await checkAsNewDevice(relay, join)).toEqual({ status: 'waiting' });
  });
});
