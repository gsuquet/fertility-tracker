import { describe, expect, it } from 'vitest';
import { syncOnce, newSyncState } from '../../domain/sync/engine';
import type { VaultDay } from '../../domain/sync/vaultContent';
import { fromBase64Url, randomBytes, toBase64Url } from '../../domain/vault/bytes';
import {
  lookupObjectContext,
  recoveryBlobContext,
  unwrapKey,
  unwrapWithKey,
  wrapKey,
} from '../../domain/vault/keyWrap';
import { deriveRecoveryValues, parseRecoveryCode } from '../../domain/vault/recoveryCode';
import { ECDSA } from '../../domain/vault/signingChain';
import { openVault, readVaultObject, sealVault } from '../../domain/vault/vaultObject';
import type { Member, VaultHeader } from '../../domain/vault/vaultObject';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import { VaultError, createVault, vaultStoreOf } from '../deviceVault';
import type { DeviceRecord } from '../keyStore';

const days: VaultDay[] = [
  { date: '2026-10-01', day: { bleeding: 'H' }, clock: { time: 5, counter: 0, member: 'm' } },
];

const created = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  const { record, recoveryCode } = await createVault(harness.relay, keyStore, 'Phone');
  return { ...harness, keyStore, record, recoveryCode };
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

/** Writes a new vault in the bucket, signed with the key of the device, with a changed header. */
const rewrite = async (
  objects: ReturnType<typeof createRelayHarness>['objects'],
  record: DeviceRecord,
  change: (header: VaultHeader) => Partial<VaultHeader>,
  dataKey?: CryptoKey
) => {
  const key = `vaults/${record.vaultId}`;
  const stored = objects.get(key);
  const { header } = readVaultObject(stored?.value as string) ?? { header: null as never };
  const entry = header.keyring.find(m => m.id === record.memberId) as Member;
  const context = (purpose: 'data' | 'signing') => ({
    vaultId: record.vaultId,
    memberId: entry.id,
    keyId: header.keyId,
    purpose,
  });
  const raw = (await unwrapKey(
    entry.dataKey,
    record.privateKey,
    context('data')
  )) as Uint8Array<ArrayBuffer>;
  const pkcs8 = (await unwrapKey(
    entry.signingKey as Member['dataKey'],
    record.privateKey,
    context('signing')
  )) as Uint8Array<ArrayBuffer>;
  const {
    format: _f,
    iv: _i,
    ...fields
  } = { ...header, counter: header.counter + 1, ...change(header) };
  const text = await sealVault({
    ...fields,
    days,
    dataKey: dataKey ?? (await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt'])),
    signingKey: await crypto.subtle.importKey('pkcs8', pkcs8, ECDSA, false, ['sign']),
  });
  objects.set(key, { value: text, etag: `r${header.counter}`, customMetadata: {} });
  return { header, entry };
};

describe('new vault', () => {
  it('writes a vault with the device and the recovery member as owners, and the lookup object', async () => {
    const { objects, keyStore, record, recoveryCode } = await created();
    expect(await keyStore.load()).toEqual(record);
    expect(recoveryCode).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{1,4}){6}$/);
    const text = objects.get(`vaults/${record.vaultId}`)?.value as string;
    const opened = await openVault(text, {
      vaultId: record.vaultId,
      trustedSigningKey: record.trustedSigningKey,
      last: null,
    });
    if ('refused' in opened) throw new Error(opened.refused);
    expect(opened.header.counter).toBe(1);
    expect(record.last).toEqual({ counter: 1, digest: opened.digest });
    const [device, recoveryMember] = opened.header.keyring as [Member, Member];
    expect(device).toMatchObject({
      id: record.memberId,
      role: 'owner',
      publicKey: record.publicKey,
    });
    expect(device.lookup).toBeDefined();
    expect(recoveryMember.role).toBe('owner');
    expect(recoveryMember.lookup).toBeUndefined();

    // The recovery code opens the lookup object and the recovery blob
    const values = await deriveRecoveryValues(
      (await parseRecoveryCode(recoveryCode)) as Uint8Array<ArrayBuffer>
    );
    const lookup = objects.get(`recovery/${values.lookupId}`);
    expect(lookup?.customMetadata).toEqual({ vaultId: record.vaultId });
    const vaultId = await unwrapWithKey(
      JSON.parse(lookup?.value as string),
      values.lookupKey,
      lookupObjectContext(values.lookupId)
    );
    expect(new TextDecoder().decode(vaultId as Uint8Array)).toBe(record.vaultId);
    const blob = await unwrapWithKey(
      opened.header.recoveryBlob as never,
      values.wrappingKey,
      recoveryBlobContext(record.vaultId, values.lookupId)
    );
    const content = JSON.parse(new TextDecoder().decode(blob as Uint8Array));
    expect(content).toMatchObject({ signingPublicKey: record.trustedSigningKey, counter: 1 });
    expect(fromBase64Url(content.privateKey)?.length).toBeGreaterThan(100);
    // The access token of the recovery code is the token of the recovery member
    const { sha256, utf8 } = await import('../../domain/vault/bytes');
    expect(recoveryMember.tokenHash).toBe(toBase64Url(await sha256(utf8(values.accessToken))));
  });

  it('saves nothing when a write fails', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    harness.env.VAULTS = undefined;
    expect(await reasonOf(createVault(harness.relay, keyStore, 'Phone'))).toEqual({
      reason: 'relay',
      ok: false,
      status: 503,
      error: 'unavailable',
    });
    const second = createRelayHarness();
    second.failWhen(request => request.url.includes('/recovery/'));
    expect(await reasonOf(createVault(second.relay, keyStore, 'Phone'))).toMatchObject({
      reason: 'relay',
      status: 0,
    });
    expect(await keyStore.load()).toBeNull();
  });
});

describe('vault store', () => {
  it('reads and writes the days, and a second store of the same device reads them', async () => {
    const { relay, keyStore, record } = await created();
    const store = vaultStoreOf(relay, keyStore, record);
    const first = await store.read();
    expect(first?.days).toEqual([]);
    const etag = await store.write(days, first?.etag ?? null);
    expect(etag).toEqual(expect.any(String));
    expect((await keyStore.load())?.last?.counter).toBe(2);
    const other = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    expect((await other.read())?.days).toEqual(days);
    // A second write after the first write uses the next counter
    const again = await store.write([], etag as string);
    expect((await keyStore.load())?.last?.counter).toBe(3);
    expect(again).toEqual(expect.any(String));
  });

  it('gives null when the vault changed after the read', async () => {
    const { relay, keyStore, record } = await created();
    const a = vaultStoreOf(relay, keyStore, record);
    const b = vaultStoreOf(relay, keyStore, record);
    const readA = await a.read();
    const readB = await b.read();
    expect(await a.write(days, readA?.etag ?? null)).not.toBeNull();
    expect(await b.write([], readB?.etag ?? null)).toBeNull();
  });

  it('works with the sync engine', async () => {
    const { relay, keyStore, record } = await created();
    const store = vaultStoreOf(relay, keyStore, record);
    const observation = { id: 'o1', date: '2026-10-02', bleeding: 'L' } as never;
    const result = await syncOnce({
      state: newSyncState(record.memberId, [observation]),
      observations: [observation],
      store,
      now: 1000,
      recoveryData: false,
      saveFailed: false,
      observationsMissing: false,
      confirmDeletions: async () => true,
    });
    expect(result.status).toBe('synced');
    const reader = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    expect((await reader.read())?.days.map(day => day.date)).toEqual(['2026-10-02']);
  });

  it('gives a vault error for a relay error, a refused vault and a write before a read', async () => {
    const { relay, keyStore, record, env } = await created();
    expect(
      await reasonOf(
        vaultStoreOf(relay, keyStore, { ...record, vaultId: toBase64Url(randomBytes(16)) }).read()
      )
    ).toMatchObject({ reason: 'relay', status: 404 });
    expect(
      await reasonOf(vaultStoreOf(relay, keyStore, { ...record, trustedSigningKey: 'AA' }).read())
    ).toEqual({ reason: 'refused', refusal: 'untrusted' });
    const store = vaultStoreOf(relay, keyStore, record);
    expect(await reasonOf(store.write(days, 'x'))).toEqual({ reason: 'noRead' });
    const read = await store.read();
    env.VAULTS = undefined;
    expect(await reasonOf(store.write(days, read?.etag ?? null))).toMatchObject({
      reason: 'relay',
      status: 503,
    });
  });

  it('gives a vault error when the keyring has no entry or the keys do not unwrap', async () => {
    const setups: [
      string,
      (header: VaultHeader, record: DeviceRecord) => Promise<Partial<VaultHeader>>,
    ][] = [
      [
        'removed',
        // The token stays in the keyring, but the entry has a different member id
        async (header, record) => ({
          keyring: header.keyring.map(m =>
            m.id === record.memberId ? { ...m, id: toBase64Url(randomBytes(8)) } : m
          ),
        }),
      ],
      [
        'keys',
        async (header, record) => ({
          keyring: await Promise.all(
            header.keyring.map(async m =>
              m.id === record.memberId ? { ...m, dataKey: await wrapOther() } : m
            )
          ),
        }),
      ],
    ];
    for (const [reason, change] of setups) {
      const { relay, keyStore, record, objects } = await created();
      const values = await change(
        (
          readVaultObject(objects.get(`vaults/${record.vaultId}`)?.value as string) as {
            header: VaultHeader;
          }
        ).header,
        record
      );
      await rewrite(objects, record, () => values);
      expect(await reasonOf(vaultStoreOf(relay, keyStore, record).read())).toEqual({ reason });
    }
  });

  it('gives the relay error 401 to a device that the owner removed', async () => {
    const { relay, keyStore, record, objects } = await created();
    await rewrite(objects, record, header => ({
      keyring: header.keyring.filter(m => m.id !== record.memberId),
    }));
    expect(await reasonOf(vaultStoreOf(relay, keyStore, record).read())).toMatchObject({
      reason: 'relay',
      status: 401,
      error: 'token',
    });
  });

  it('gives a vault error when the days do not decrypt', async () => {
    const { relay, keyStore, record, objects } = await created();
    const other = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
    ]);
    await rewrite(objects, record, () => ({}), other);
    expect(await reasonOf(vaultStoreOf(relay, keyStore, record).read())).toEqual({
      reason: 'content',
    });
  });

  it('refuses a write for a reader, an owner without a signing key, or a signing key that does not unwrap', async () => {
    const cases: [string, (entry: Member) => Promise<Member>][] = [
      ['reader', async entry => ({ ...entry, role: 'reader' })],
      ['reader', async ({ signingKey: _s, ...entry }) => entry],
      ['keys', async entry => ({ ...entry, signingKey: await wrapOther() })],
    ];
    for (const [reason, change] of cases) {
      const { relay, keyStore, record, objects } = await created();
      const header = (
        readVaultObject(objects.get(`vaults/${record.vaultId}`)?.value as string) as {
          header: VaultHeader;
        }
      ).header;
      const keyring = await Promise.all(
        header.keyring.map(m => (m.id === record.memberId ? change(m) : m))
      );
      await rewrite(objects, record, () => ({ keyring }));
      const store = vaultStoreOf(relay, keyStore, record);
      const read = await store.read();
      expect(await reasonOf(store.write(days, read?.etag ?? null))).toEqual({ reason });
    }
  });
});

/** A key wrapped for a different device. */
async function wrapOther() {
  const other = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
    'deriveBits',
  ]);
  return wrapKey(randomBytes(32), other.publicKey, {
    vaultId: 'v',
    memberId: 'm',
    keyId: 'k',
    purpose: 'data',
  });
}
