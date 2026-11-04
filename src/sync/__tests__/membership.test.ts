import { describe, expect, it } from 'vitest';
import { randomBytes, sha256, toBase64Url, utf8 } from '../../domain/vault/bytes';
import {
  earlierKeyContext,
  lookupObjectContext,
  recoveryBlobContext,
  unwrapWithKey,
  wrapWithKey,
} from '../../domain/vault/keyWrap';
import {
  deriveRecoveryValues,
  formatRecoveryCode,
  newRecoverySecret,
  parseRecoveryCode,
} from '../../domain/vault/recoveryCode';
import { readVaultObject } from '../../domain/vault/vaultObject';
import type { VaultHeader } from '../../domain/vault/vaultObject';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import {
  VaultError,
  createVault,
  lookupCopyOf,
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
import type { DeviceRecord, KeyStore } from '../keyStore';
import { newRecoveryCode, recoverWithCode, removeMember } from '../membership';
import type { RelayClient } from '../relayClient';

const days = [
  { date: '2026-10-01', day: { bleeding: 'H' }, clock: { time: 5, counter: 0, member: 'm' } },
] as never;

const reasonOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof VaultError) return { reason: error.reason, ...error.detail };
    throw error;
  }
  throw new Error('No error');
};

const join = async (relay: RelayClient, ownerStore: KeyStore, role: 'owner' | 'reader') => {
  const ownerRecord = (await ownerStore.load()) as DeviceRecord;
  const owner = await startInvitation(relay, ownerStore, ownerRecord, role);
  const state = await startJoin(relay, owner.invitation);
  await checkAsOwner(relay, ownerRecord, owner);
  await checkAsNewDevice(relay, state);
  await checkAsOwner(relay, ownerRecord, owner);
  await approveInvitation(relay, ownerStore, ownerRecord, owner);
  const answered = await checkAsNewDevice(relay, state);
  if (answered.status !== 'answered') throw new Error(answered.status);
  const store = createMemoryKeyStore();
  const record = await finishJoin(relay, store, state, answered.offer, answered.content);
  return { record, store };
};

const setup = async () => {
  const harness = createRelayHarness();
  const ownerStore = createMemoryKeyStore();
  const { record, recoveryCode } = await createVault(harness.relay, ownerStore);
  const store = vaultStoreOf(harness.relay, ownerStore, record);
  const first = await store.read();
  await store.write(days, first?.etag ?? null);
  const headerOf = () =>
    (
      readVaultObject(harness.objects.get(`vaults/${record.vaultId}`)?.value as string) as {
        header: VaultHeader;
      }
    ).header;
  const owner = async () => (await ownerStore.load()) as DeviceRecord;
  return { ...harness, ownerStore, recoveryCode, headerOf, owner };
};

const daysOf = async (relay: RelayClient, store: KeyStore) =>
  (await openSession(relay, store, (await store.load()) as DeviceRecord)).days;

describe('removal of a member', () => {
  it('removes a reader with a new data key, and keeps the old key in the earlier keys', async () => {
    const { relay, ownerStore, headerOf, owner } = await setup();
    const reader = await join(relay, ownerStore, 'reader');
    const before = await openSession(relay, ownerStore, await owner());
    const chain = before.header.signingChain.length;
    await removeMember(relay, ownerStore, await owner(), reader.record.memberId);
    const header = headerOf();
    expect(header.keyring.some(m => m.id === reader.record.memberId)).toBe(false);
    expect(header.keyId).not.toBe(before.header.keyId);
    expect(header.signingChain).toHaveLength(chain);
    expect(await daysOf(relay, ownerStore)).toEqual(days);
    expect(await reasonOf(daysOf(relay, reader.store))).toMatchObject({
      reason: 'relay',
      status: 401,
    });
    // The earlier key decrypts with the new data key
    const after = await openSession(relay, ownerStore, await owner());
    const earlier = after.header.earlierKeys[0];
    const raw = await unwrapWithKey(
      earlier?.key as never,
      after.dataKey,
      earlierKeyContext(after.record.vaultId, before.header.keyId)
    );
    expect(raw).toEqual(before.rawDataKey);
  });

  it('encrypts each earlier key again at the next rekey', async () => {
    const { relay, ownerStore, owner } = await setup();
    const first = await join(relay, ownerStore, 'reader');
    const second = await join(relay, ownerStore, 'reader');
    const start = await openSession(relay, ownerStore, await owner());
    await removeMember(relay, ownerStore, await owner(), first.record.memberId);
    await removeMember(relay, ownerStore, await owner(), second.record.memberId);
    const end = await openSession(relay, ownerStore, await owner());
    expect(end.header.earlierKeys).toHaveLength(2);
    const [oldest] = end.header.earlierKeys;
    const raw = await unwrapWithKey(
      oldest?.key as never,
      end.dataKey,
      earlierKeyContext(end.record.vaultId, start.header.keyId)
    );
    expect(raw).toEqual(start.rawDataKey);
  });

  it('removes an owner device with a new signing key, and the other owners follow the chain', async () => {
    const { relay, ownerStore, headerOf, owner } = await setup();
    const removed = await join(relay, ownerStore, 'owner');
    const other = await join(relay, ownerStore, 'owner');
    const chain = headerOf().signingChain.length;
    const next = await removeMember(relay, ownerStore, await owner(), removed.record.memberId);
    expect(headerOf().signingChain).toHaveLength(chain + 1);
    expect(next.trustedSigningKey).toBe(headerOf().signingChain[chain]?.publicKey);
    expect(await daysOf(relay, other.store)).toEqual(days);
    expect((await other.store.load())?.trustedSigningKey).toBe(next.trustedSigningKey);
    expect(await reasonOf(daysOf(relay, removed.store))).toMatchObject({
      reason: 'relay',
      status: 401,
    });
  });

  it('refuses an unknown member, the device itself, and a vault that changed', async () => {
    const { relay, ownerStore, owner, bucket } = await setup();
    expect(await reasonOf(removeMember(relay, ownerStore, await owner(), 'unknown'))).toEqual({
      reason: 'member',
    });
    expect(
      await reasonOf(removeMember(relay, ownerStore, await owner(), (await owner()).memberId))
    ).toEqual({ reason: 'member' });
    const reader = await join(relay, ownerStore, 'reader');
    const put = bucket.put.bind(bucket);
    bucket.put = async (key, value, options) => {
      if (key.startsWith('vaults/')) await put(key, value);
      return put(key, value, options);
    };
    expect(
      await reasonOf(removeMember(relay, ownerStore, await owner(), reader.record.memberId))
    ).toEqual({ reason: 'relay', status: 412, error: 'changed' });
  });

  it('gives a keys error when an earlier key does not decrypt', async () => {
    const { relay, ownerStore, owner } = await setup();
    const reader = await join(relay, ownerStore, 'reader');
    const session = await openSession(relay, ownerStore, await owner());
    const garbage = {
      keyId: 'AA',
      key: { iv: toBase64Url(randomBytes(12)), data: toBase64Url(randomBytes(48)) },
    };
    await writeSession(
      relay,
      ownerStore,
      { ...session, header: { ...session.header, earlierKeys: [garbage] } },
      {}
    );
    expect(
      await reasonOf(removeMember(relay, ownerStore, await owner(), reader.record.memberId))
    ).toEqual({ reason: 'keys' });
  });
  it('keeps a vault without a recovery blob without one, and gives a relay error when the write fails', async () => {
    const { relay, ownerStore, owner, headerOf, failWhen } = await setup();
    const first = await join(relay, ownerStore, 'reader');
    const second = await join(relay, ownerStore, 'reader');
    const session = await openSession(relay, ownerStore, await owner());
    const { recoveryBlob: _blob, ...header } = session.header;
    await writeSession(relay, ownerStore, { ...session, header }, {});
    await removeMember(relay, ownerStore, await owner(), first.record.memberId);
    expect(headerOf().recoveryBlob).toBeUndefined();
    failWhen(request => request.method === 'PUT' && request.url.includes('/vaults/'));
    expect(
      await reasonOf(removeMember(relay, ownerStore, await owner(), second.record.memberId))
    ).toMatchObject({ reason: 'relay', status: 0 });
  });
});

describe('recovery code', () => {
  it('recovers on a new device, makes a new code, and the old code stops working', async () => {
    const { relay, ownerStore, recoveryCode, objects, headerOf } = await setup();
    const oldValues = await deriveRecoveryValues(
      (await parseRecoveryCode(recoveryCode)) as Uint8Array<ArrayBuffer>
    );
    const store = createMemoryKeyStore();
    const recovered = await recoverWithCode(relay, store, recoveryCode);
    expect(recovered.record.role).toBe('owner');
    expect(recovered.recoveryCode).not.toBe(recoveryCode);
    expect(await store.load()).toEqual(recovered.record);
    expect(await daysOf(relay, store)).toEqual(days);
    // The first owner device follows the new signing key
    expect(await daysOf(relay, ownerStore)).toEqual(days);
    // The old recovery member and the old lookup object are gone
    expect(objects.has(`recovery/${oldValues.lookupId}`)).toBe(false);
    const oldHash = toBase64Url(await sha256(utf8(oldValues.accessToken)));
    expect(headerOf().keyring.some(m => m.tokenHash === oldHash)).toBe(false);
    expect(
      await reasonOf(recoverWithCode(relay, createMemoryKeyStore(), recoveryCode))
    ).toMatchObject({ reason: 'relay', status: 404 });
    // Each owner except the recovery member has the new lookup copy, and the new code works
    const session = await openSession(relay, store, recovered.record);
    expect(session.entry.lookup).toBeDefined();
    const again = await recoverWithCode(relay, createMemoryKeyStore(), recovered.recoveryCode);
    expect(again.record.vaultId).toBe(recovered.record.vaultId);
  });

  it('gives the recovered device a lookup copy, so that it makes the new code again after a failure', async () => {
    const { relay, recoveryCode, failWhen, headerOf } = await setup();
    let puts = 0;
    failWhen(request => {
      if (request.method !== 'PUT' || !request.url.includes('/vaults/')) return false;
      puts += 1;
      return puts === 2;
    });
    const store = createMemoryKeyStore();
    expect(await reasonOf(recoverWithCode(relay, store, recoveryCode))).toMatchObject({
      reason: 'relay',
      status: 0,
    });
    failWhen(null);
    const record = (await store.load()) as DeviceRecord;
    expect(headerOf().keyring.find(m => m.id === record.memberId)?.lookup).toBeDefined();
    const next = await newRecoveryCode(relay, store, record);
    expect(
      await reasonOf(recoverWithCode(relay, createMemoryKeyStore(), recoveryCode))
    ).toMatchObject({ reason: 'relay' });
    expect(
      (await recoverWithCode(relay, createMemoryKeyStore(), next.recoveryCode)).record.vaultId
    ).toBe(record.vaultId);
  });

  it('removes the recovery member of the current code when another owner makes a new code during the recovery', async () => {
    const { relay, ownerStore, recoveryCode, owner, headerOf, objects } = await setup();
    let codeOfOwner = '';
    let puts = 0;
    const racing: RelayClient = {
      ...relay,
      putVault: async (...args) => {
        const result = await relay.putVault(...args);
        puts += 1;
        if (puts === 1)
          codeOfOwner = (await newRecoveryCode(relay, ownerStore, await owner())).recoveryCode;
        return result;
      },
    };
    const recovered = await recoverWithCode(racing, createMemoryKeyStore(), recoveryCode);
    const values = await deriveRecoveryValues(
      (await parseRecoveryCode(codeOfOwner)) as Uint8Array<ArrayBuffer>
    );
    const hash = toBase64Url(await sha256(utf8(values.accessToken)));
    expect(headerOf().keyring.some(m => m.tokenHash === hash)).toBe(false);
    expect(objects.has(`recovery/${values.lookupId}`)).toBe(false);
    expect(
      (await recoverWithCode(relay, createMemoryKeyStore(), recovered.recoveryCode)).record.vaultId
    ).toBe(recovered.record.vaultId);
  });

  it('makes a new code on an owner device from its lookup copy', async () => {
    const { relay, ownerStore, recoveryCode, owner, objects } = await setup();
    const oldValues = await deriveRecoveryValues(
      (await parseRecoveryCode(recoveryCode)) as Uint8Array<ArrayBuffer>
    );
    const result = await newRecoveryCode(relay, ownerStore, await owner());
    const values = await deriveRecoveryValues(
      (await parseRecoveryCode(result.recoveryCode)) as Uint8Array<ArrayBuffer>
    );
    expect(objects.get(`recovery/${values.lookupId}`)?.customMetadata).toEqual({
      vaultId: result.record.vaultId,
    });
    expect(objects.has(`recovery/${oldValues.lookupId}`)).toBe(false);
    // The new recovery blob names the current signing key and counter
    const header = (
      readVaultObject(objects.get(`vaults/${result.record.vaultId}`)?.value as string) as {
        header: VaultHeader;
      }
    ).header;
    const blob = await unwrapWithKey(
      header.recoveryBlob as never,
      values.wrappingKey,
      recoveryBlobContext(result.record.vaultId, values.lookupId)
    );
    expect(JSON.parse(new TextDecoder().decode(blob as Uint8Array))).toMatchObject({
      signingPublicKey: result.record.trustedSigningKey,
      counter: header.counter,
    });
  });

  it('gives errors for a code that is not valid, a lookup object that does not decrypt, and a failed write', async () => {
    const { relay, ownerStore, recoveryCode, objects, owner, failWhen, bucket } = await setup();
    expect(await reasonOf(recoverWithCode(relay, createMemoryKeyStore(), 'not a code'))).toEqual({
      reason: 'code',
    });
    expect(
      await reasonOf(
        recoverWithCode(
          relay,
          createMemoryKeyStore(),
          await formatRecoveryCode(newRecoverySecret())
        )
      )
    ).toMatchObject({ reason: 'relay', status: 404 });
    const values = await deriveRecoveryValues(
      (await parseRecoveryCode(recoveryCode)) as Uint8Array<ArrayBuffer>
    );
    const key = `recovery/${values.lookupId}`;
    const stored = objects.get(key);
    if (!stored) throw new Error('No lookup object');
    for (const value of ['not json', '{}', JSON.stringify({ iv: 'AA', data: 'AA' })]) {
      objects.set(key, { ...stored, value });
      expect(await reasonOf(recoverWithCode(relay, createMemoryKeyStore(), recoveryCode))).toEqual({
        reason: 'code',
      });
    }
    objects.set(key, stored);
    failWhen(request => request.method === 'PUT' && request.url.includes('/recovery/'));
    expect(await reasonOf(newRecoveryCode(relay, ownerStore, await owner()))).toMatchObject({
      reason: 'relay',
      status: 0,
    });
    failWhen(null);
    const put = bucket.put.bind(bucket);
    bucket.put = async (k, value, options) => {
      if (k.startsWith('vaults/')) await put(k, value);
      return put(k, value, options);
    };
    expect(await reasonOf(newRecoveryCode(relay, ownerStore, await owner()))).toEqual({
      reason: 'relay',
      status: 412,
      error: 'changed',
    });
  });

  it('gives a relay error when the recovery member is removed, or the vault changes during the recovery', async () => {
    const { relay, recoveryCode, bucket, headerOf, ownerStore, owner } = await setup();
    const put = bucket.put.bind(bucket);
    bucket.put = async (k, value, options) => {
      if (k.startsWith('vaults/')) await put(k, value);
      return put(k, value, options);
    };
    expect(await reasonOf(recoverWithCode(relay, createMemoryKeyStore(), recoveryCode))).toEqual({
      reason: 'relay',
      status: 412,
      error: 'changed',
    });
    bucket.put = put;
    // An owner device removes the recovery member: the token of the code stops working
    const recoveryId = headerOf().keyring.find(m => m.lookup === undefined)?.id as string;
    await removeMember(relay, ownerStore, await owner(), recoveryId);
    expect(
      await reasonOf(recoverWithCode(relay, createMemoryKeyStore(), recoveryCode))
    ).toMatchObject({ reason: 'relay', status: 401 });
  });

  it('gives a keys error for a recovery blob that is not valid, and removed for a vault without a blob', async () => {
    const { relay, recoveryCode } = await setup();
    const values = await deriveRecoveryValues(
      (await parseRecoveryCode(recoveryCode)) as Uint8Array<ArrayBuffer>
    );
    /** A relay client that changes the recovery blob of the vault that it gives. */
    const withBlob = (blob: unknown): RelayClient => ({
      ...relay,
      getVault: async (vaultId, token) => {
        const result = await relay.getVault(vaultId, token);
        if (!result.ok) return result;
        const object = JSON.parse(result.text);
        const header = JSON.parse(object.header);
        if (blob === undefined) delete header.recoveryBlob;
        else header.recoveryBlob = blob;
        return { ...result, text: JSON.stringify({ ...object, header: JSON.stringify(header) }) };
      },
    });
    const sealed = (content: unknown) => async (vaultId: string) =>
      wrapWithKey(
        utf8(JSON.stringify(content)),
        values.wrappingKey,
        recoveryBlobContext(vaultId, values.lookupId)
      );
    const vaultId = new TextDecoder().decode(
      (await unwrapWithKey(
        JSON.parse(((await relay.getRecovery(values.lookupId)) as { text: string }).text),
        values.lookupKey,
        lookupObjectContext(values.lookupId)
      )) as Uint8Array
    );
    expect(
      await reasonOf(recoverWithCode(withBlob(undefined), createMemoryKeyStore(), recoveryCode))
    ).toEqual({ reason: 'removed' });
    const bad = [
      { iv: toBase64Url(randomBytes(12)), data: toBase64Url(randomBytes(32)) },
      await wrapWithKey(
        utf8('not json'),
        values.wrappingKey,
        recoveryBlobContext(vaultId, values.lookupId)
      ),
      await sealed({ privateKey: 'AA', signingPublicKey: 'k', counter: 1 })(vaultId),
      await sealed({ privateKey: '%', signingPublicKey: 'k', counter: 1 })(vaultId),
      await sealed({ privateKey: 'AA', signingPublicKey: 7, counter: 1 })(vaultId),
      await sealed({ privateKey: 'AA', signingPublicKey: 'k', counter: '1' })(vaultId),
    ];
    for (const blob of bad)
      expect(
        await reasonOf(recoverWithCode(withBlob(blob), createMemoryKeyStore(), recoveryCode))
      ).toEqual({ reason: 'keys' });
  });

  it('gives a keys error for a new code without a lookup copy', async () => {
    const { relay, ownerStore, owner } = await setup();
    const session = await openSession(relay, ownerStore, await owner());
    const keyring = session.header.keyring.map(({ lookup: _lookup, ...m }) => m);
    await writeSession(relay, ownerStore, session, { keyring });
    expect(await reasonOf(newRecoveryCode(relay, ownerStore, await owner()))).toEqual({
      reason: 'keys',
    });
    // A rekey without a lookup copy would remove the copy of each owner
    const reader = await join(relay, ownerStore, 'reader');
    expect(
      await reasonOf(removeMember(relay, ownerStore, await owner(), reader.record.memberId))
    ).toEqual({ reason: 'keys' });
  });
});

describe('lookupCopyOf', () => {
  it('gives the recovery member of a copy, or null', () => {
    expect(
      lookupCopyOf(utf8(JSON.stringify({ lookupId: 'l', memberId: 'm', object: '{}' })))
    ).toEqual({ lookupId: 'l', memberId: 'm' });
    expect(lookupCopyOf(null)).toBeNull();
    expect(lookupCopyOf(utf8('not json'))).toBeNull();
    expect(lookupCopyOf(utf8(JSON.stringify({ lookupId: 'l' })))).toBeNull();
  });
});
