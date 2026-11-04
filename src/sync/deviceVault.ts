/** A new vault for this device, and the vault store of the sync engine. See docs/reference/sync-client.md. */
import type { VaultStore } from '../domain/sync/engine';
import type { VaultDay } from '../domain/sync/vaultContent';
import { randomBytes, sha256, toBase64Url, utf8 } from '../domain/vault/bytes';
import {
  earlierKeyContext,
  importEcdhPublicKey,
  lookupObjectContext,
  recoveryBlobContext,
  unwrapKey,
  unwrapWithKey,
  wrapKey,
  wrapWithKey,
} from '../domain/vault/keyWrap';
import type { KeyContext, SealedBytes } from '../domain/vault/keyWrap';
import {
  deriveRecoveryValues,
  formatRecoveryCode,
  newRecoverySecret,
} from '../domain/vault/recoveryCode';
import { ECDSA, extendSigningChain, newSigningChain } from '../domain/vault/signingChain';
import {
  decryptVaultDays,
  openVault,
  readVaultObject,
  sealVault,
} from '../domain/vault/vaultObject';
import type { Member, OpenRefusal, VaultHeader } from '../domain/vault/vaultObject';
import type { DeviceRecord, KeyStore } from './keyStore';
import type { RelayClient } from './relayClient';

export type VaultErrorReason =
  | 'relay'
  | 'refused'
  | 'removed'
  | 'keys'
  | 'content'
  | 'reader'
  | 'noRead'
  | 'invitation'
  | 'member'
  | 'code';

export class VaultError extends Error {
  constructor(
    readonly reason: VaultErrorReason,
    readonly detail?: { status?: number; error?: string; refusal?: OpenRefusal }
  ) {
    super(`Vault error: ${reason}`);
    this.name = 'VaultError';
  }
}

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;
const newId = (bytes: number) => toBase64Url(randomBytes(bytes));
const digestOf = async (text: string) => toBase64Url(await sha256(utf8(text)));
const rawPublicKey = async (key: CryptoKey) =>
  toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
const pkcs8 = async (key: CryptoKey) => new Uint8Array(await crypto.subtle.exportKey('pkcs8', key));
const importDataKey = (raw: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

const contextOf = (
  vaultId: string,
  memberId: string,
  keyId: string,
  purpose: KeyContext['purpose']
) => ({ vaultId, memberId, keyId, purpose });

/** Makes a vault with this device and the recovery member as owners. */
export async function createVault(
  relay: RelayClient,
  keyStore: KeyStore
): Promise<{ record: DeviceRecord; recoveryCode: string }> {
  const vaultId = newId(16);
  const keyId = newId(8);
  const rawDataKey = randomBytes(32);
  const device = await crypto.subtle.generateKey(ECDH, false, ['deriveBits']);
  const recoveryPair = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']);
  const signing = await newSigningChain();
  const signingPrivate = await pkcs8(signing.privateKey);
  const signingPublicKey = signing.chain[0]?.publicKey as string;
  const token = newId(32);
  const secret = newRecoverySecret();
  const recovery = await deriveRecoveryValues(secret);
  const deviceId = newId(8);
  const recoveryId = newId(8);

  const lookupObject = JSON.stringify(
    await wrapWithKey(utf8(vaultId), recovery.lookupKey, lookupObjectContext(recovery.lookupId))
  );
  const lookupCopy = utf8(
    JSON.stringify({ lookupId: recovery.lookupId, object: lookupObject, memberId: recoveryId })
  );
  const member = async (
    id: string,
    publicKey: CryptoKey,
    tokenText: string,
    withLookup: boolean
  ): Promise<Member> => ({
    id,
    role: 'owner',
    publicKey: await rawPublicKey(publicKey),
    tokenHash: await digestOf(tokenText),
    dataKey: await wrapKey(rawDataKey, publicKey, contextOf(vaultId, id, keyId, 'data')),
    signingKey: await wrapKey(signingPrivate, publicKey, contextOf(vaultId, id, keyId, 'signing')),
    ...(withLookup
      ? { lookup: await wrapKey(lookupCopy, publicKey, contextOf(vaultId, id, keyId, 'lookup')) }
      : {}),
  });
  const blob = utf8(
    JSON.stringify({
      privateKey: toBase64Url(await pkcs8(recoveryPair.privateKey)),
      signingPublicKey,
      counter: 1,
    })
  );
  const text = await sealVault({
    vaultId,
    keyId,
    counter: 1,
    keyring: [
      await member(deviceId, device.publicKey, token, true),
      await member(recoveryId, recoveryPair.publicKey, recovery.accessToken, false),
    ],
    signingChain: signing.chain,
    earlierKeys: [],
    recoveryBlob: await wrapWithKey(
      blob,
      recovery.wrappingKey,
      recoveryBlobContext(vaultId, recovery.lookupId)
    ),
    days: [],
    dataKey: await importDataKey(rawDataKey),
    signingKey: signing.privateKey,
  });

  const written = await relay.putVault(vaultId, token, text, null);
  if (!written.ok) throw new VaultError('relay', written);
  const lookup = await relay.putRecovery(recovery.lookupId, token, vaultId, lookupObject, null);
  if (!lookup.ok) throw new VaultError('relay', lookup);

  const record: DeviceRecord = {
    vaultId,
    memberId: deviceId,
    role: 'owner',
    token,
    privateKey: device.privateKey,
    publicKey: await rawPublicKey(device.publicKey),
    trustedSigningKey: signingPublicKey,
    last: { counter: 1, digest: await digestOf(text) },
  };
  await keyStore.save(record);
  return { record, recoveryCode: await formatRecoveryCode(secret) };
}

/** The last vault that the device read or wrote, with the keys of the device. */
/** The part of the key store that a session uses. */
export type RecordSaver = Pick<KeyStore, 'save'>;

export interface VaultSession {
  record: DeviceRecord;
  header: VaultHeader;
  etag: string;
  days: VaultDay[];
  rawDataKey: Uint8Array<ArrayBuffer>;
  dataKey: CryptoKey;
  entry: Member;
}

/** The keys that only an owner unwraps: the signing private key and the lookup copy. */
export interface OwnerKeys {
  rawSigningKey: Uint8Array<ArrayBuffer>;
  signingKey: CryptoKey;
  lookupCopy: Uint8Array<ArrayBuffer> | null;
}

/** Reads, checks and decrypts the vault, then saves the new trusted key and counter. */
export async function openSession(
  relay: RelayClient,
  keyStore: RecordSaver,
  record: DeviceRecord
): Promise<VaultSession> {
  const result = await relay.getVault(record.vaultId, record.token);
  if (!result.ok) throw new VaultError('relay', result);
  const opened = await openVault(result.text, {
    vaultId: record.vaultId,
    trustedSigningKey: record.trustedSigningKey,
    last: record.last,
  });
  if ('refused' in opened) throw new VaultError('refused', { refusal: opened.refused });
  const entry = opened.header.keyring.find(member => member.id === record.memberId);
  if (!entry) throw new VaultError('removed');
  const rawDataKey = await unwrapKey(
    entry.dataKey,
    record.privateKey,
    contextOf(record.vaultId, entry.id, opened.header.keyId, 'data')
  );
  if (!rawDataKey) throw new VaultError('keys');
  const dataKey = await importDataKey(rawDataKey);
  const days = await decryptVaultDays(opened, dataKey);
  if (!days) throw new VaultError('content');
  const next: DeviceRecord = {
    ...record,
    role: entry.role,
    trustedSigningKey: opened.signingKey,
    last: { counter: opened.header.counter, digest: opened.digest },
  };
  await keyStore.save(next);
  return {
    record: next,
    header: opened.header,
    etag: result.etag as string,
    days,
    rawDataKey,
    dataKey,
    entry,
  };
}

/** The owner keys of the device. A `reader` error when the entry is not an owner. */
export async function ownerKeys(session: VaultSession): Promise<OwnerKeys> {
  const { entry, header, record } = session;
  if (entry.role !== 'owner' || !entry.signingKey) throw new VaultError('reader');
  const context = (purpose: 'signing' | 'lookup') =>
    contextOf(record.vaultId, entry.id, header.keyId, purpose);
  const rawSigningKey = await unwrapKey(entry.signingKey, record.privateKey, context('signing'));
  if (!rawSigningKey) throw new VaultError('keys');
  const signingKey = await crypto.subtle.importKey('pkcs8', rawSigningKey, ECDSA, false, ['sign']);
  const lookupCopy = entry.lookup
    ? await unwrapKey(entry.lookup, record.privateKey, context('lookup'))
    : null;
  return { rawSigningKey, signingKey, lookupCopy };
}

type MemberInfo = Pick<Member, 'id' | 'role' | 'publicKey' | 'tokenHash'>;

/** A keyring entry with the data key, and for an owner the signing key and the lookup copy. */
async function wrapEntry(
  vaultId: string,
  keyId: string,
  raw: {
    dataKey: Uint8Array<ArrayBuffer>;
    signingKey: Uint8Array<ArrayBuffer>;
    lookup: Uint8Array<ArrayBuffer> | null;
  },
  member: MemberInfo
): Promise<Member> {
  const publicKey = await importEcdhPublicKey(member.publicKey);
  if (!publicKey) throw new VaultError('keys');
  const context = (purpose: 'data' | 'signing' | 'lookup') =>
    contextOf(vaultId, member.id, keyId, purpose);
  const entry: Member = {
    ...member,
    dataKey: await wrapKey(raw.dataKey, publicKey, context('data')),
  };
  if (member.role === 'owner') {
    entry.signingKey = await wrapKey(raw.signingKey, publicKey, context('signing'));
    if (raw.lookup) entry.lookup = await wrapKey(raw.lookup, publicKey, context('lookup'));
  }
  return entry;
}

/** A keyring entry for a new member, with the keys of its role. */
export function memberFor(session: VaultSession, keys: OwnerKeys, member: MemberInfo) {
  return wrapEntry(
    session.record.vaultId,
    session.header.keyId,
    { dataKey: session.rawDataKey, signingKey: keys.rawSigningKey, lookup: keys.lookupCopy },
    member
  );
}

/** The recovery member of a lookup copy, or null when the copy has none. */
export function lookupCopyOf(
  copy: Uint8Array<ArrayBuffer> | null
): { lookupId: string; memberId: string } | null {
  if (!copy) return null;
  try {
    const value = JSON.parse(new TextDecoder().decode(copy)) as Record<string, unknown>;
    return typeof value.lookupId === 'string' && typeof value.memberId === 'string'
      ? { lookupId: value.lookupId, memberId: value.memberId }
      : null;
  } catch {
    return null;
  }
}

export interface RekeyPlan {
  remove: string[];
  add?: MemberInfo[];
  /** True when the removed member is an owner: a new signing key goes into the chain. */
  rotateSigning: boolean;
  /** A new lookup copy for the owners. Else each owner keeps the lookup copy of the device. */
  lookupCopy?: Uint8Array<ArrayBuffer>;
  /** A new recovery blob for the new signing key and counter. Else the blob does not change. */
  recoveryBlob?: (signingPublicKey: string, counter: number) => Promise<SealedBytes>;
}

/**
 * Writes the next vault with a new data key: the rekey of a removal. Null when the vault
 * changed (`412`).
 */
export async function writeRekeyed(
  relay: RelayClient,
  keyStore: RecordSaver,
  session: VaultSession,
  keys: OwnerKeys,
  plan: RekeyPlan
): Promise<VaultSession | null> {
  const { record, header } = session;
  const { vaultId } = record;
  const keyId = newId(8);
  const rawDataKey = randomBytes(32);
  const dataKey = await importDataKey(rawDataKey);
  const earlierKeys = [
    ...(await Promise.all(
      header.earlierKeys.map(async earlier => {
        const context = earlierKeyContext(vaultId, earlier.keyId);
        const raw = await unwrapWithKey(earlier.key, session.dataKey, context);
        if (!raw) throw new VaultError('keys');
        return { keyId: earlier.keyId, key: await wrapWithKey(raw, dataKey, context) };
      })
    )),
    {
      keyId: header.keyId,
      key: await wrapWithKey(session.rawDataKey, dataKey, earlierKeyContext(vaultId, header.keyId)),
    },
  ];
  let { signingChain } = header;
  let signingKey = keys.signingKey;
  let rawSigningKey = keys.rawSigningKey;
  if (plan.rotateSigning) {
    const next = await extendSigningChain(signingChain, vaultId, keys.signingKey);
    signingChain = next.chain;
    signingKey = next.privateKey;
    rawSigningKey = await pkcs8(next.privateKey);
  }
  const lookup = plan.lookupCopy ?? keys.lookupCopy;
  const recoveryId = lookupCopyOf(lookup)?.memberId;
  const members = [
    ...header.keyring.filter(member => !plan.remove.includes(member.id)),
    ...(plan.add ?? []),
  ];
  const keyring = await Promise.all(
    members.map(({ id, role, publicKey, tokenHash }) =>
      wrapEntry(
        vaultId,
        keyId,
        {
          dataKey: rawDataKey,
          signingKey: rawSigningKey,
          lookup: id === recoveryId ? null : lookup,
        },
        { id, role, publicKey, tokenHash }
      )
    )
  );
  const counter = header.counter + 1;
  const signingPublicKey = (signingChain[signingChain.length - 1] as { publicKey: string })
    .publicKey;
  const recoveryBlob = plan.recoveryBlob
    ? await plan.recoveryBlob(signingPublicKey, counter)
    : header.recoveryBlob;
  const text = await sealVault({
    vaultId,
    keyId,
    counter,
    keyring,
    signingChain,
    earlierKeys,
    ...(recoveryBlob ? { recoveryBlob } : {}),
    days: session.days,
    dataKey,
    signingKey,
  });
  const result = await relay.putVault(vaultId, record.token, text, session.etag);
  if (!result.ok && result.status === 412) return null;
  if (!result.ok) throw new VaultError('relay', result);
  const next: DeviceRecord = {
    ...record,
    trustedSigningKey: signingPublicKey,
    last: { counter, digest: await digestOf(text) },
  };
  await keyStore.save(next);
  const written = readVaultObject(text) as { header: VaultHeader };
  return {
    record: next,
    header: written.header,
    etag: result.etag as string,
    days: session.days,
    rawDataKey,
    dataKey,
    entry: written.header.keyring.find(member => member.id === record.memberId) as Member,
  };
}

/** Writes the next vault with the days and the keyring. Null when the vault changed (`412`). */
export async function writeSession(
  relay: RelayClient,
  keyStore: RecordSaver,
  session: VaultSession,
  change: { days?: VaultDay[]; keyring?: Member[] }
): Promise<VaultSession | null> {
  const { signingKey } = await ownerKeys(session);
  const { format: _format, iv: _iv, ...fields } = session.header;
  const header = {
    ...fields,
    counter: fields.counter + 1,
    keyring: change.keyring ?? fields.keyring,
  };
  const days = change.days ?? session.days;
  const text = await sealVault({ ...header, days, dataKey: session.dataKey, signingKey });
  const { record } = session;
  const result = await relay.putVault(record.vaultId, record.token, text, session.etag);
  if (!result.ok && result.status === 412) return null;
  if (!result.ok) throw new VaultError('relay', result);
  const next: DeviceRecord = {
    ...record,
    last: { counter: header.counter, digest: await digestOf(text) },
  };
  await keyStore.save(next);
  const written = readVaultObject(text) as { header: VaultHeader };
  return { ...session, record: next, header: written.header, etag: result.etag as string, days };
}

/** The vault store of the sync engine for the vault of the device record. */
export function vaultStoreOf(
  relay: RelayClient,
  keyStore: KeyStore,
  initial: DeviceRecord
): VaultStore {
  let record = initial;
  let session: VaultSession | null = null;
  return {
    async read() {
      session = await openSession(relay, keyStore, record);
      record = session.record;
      return { days: session.days, etag: session.etag };
    },
    async write(days: VaultDay[], etag: string | null) {
      if (!session) throw new VaultError('noRead');
      const written = await writeSession(
        relay,
        keyStore,
        { ...session, etag: etag as string },
        {
          days,
        }
      );
      if (!written) return null;
      session = written;
      record = written.record;
      return written.etag;
    },
  };
}
