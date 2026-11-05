/** Removal of a member, a new recovery code and a recovery with the code. See docs/reference/sync-client.md. */
import { fromBase64Url, randomBytes, sha256, toBase64Url, utf8 } from '../domain/vault/bytes';
import {
  lookupObjectContext,
  recoveryBlobContext,
  unwrapWithKey,
  wrapWithKey,
} from '../domain/vault/keyWrap';
import type { SealedBytes } from '../domain/vault/keyWrap';
import {
  deriveRecoveryValues,
  formatRecoveryCode,
  newRecoverySecret,
  parseRecoveryCode,
} from '../domain/vault/recoveryCode';
import { readVaultObject } from '../domain/vault/vaultObject';
import {
  VaultError,
  lookupCopyOf,
  memberFor,
  memberNames,
  openSession,
  ownerKeys,
  writeRekeyed,
  writeSession,
} from './deviceVault';
import type { MemberName, RecordSaver } from './deviceVault';
import type { DeviceRecord, KeyStore } from './keyStore';
import type { RelayClient } from './relayClient';
import { isOutOfVault } from '../utils/syncFailure';

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;
const newId = (bytes: number) => toBase64Url(randomBytes(bytes));
const hashOf = async (text: string) => toBase64Url(await sha256(utf8(text)));
const rawPublicKey = async (key: CryptoKey) =>
  toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
const changed = () => new VaultError('relay', { status: 412, error: 'changed' });

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** A record saver in memory, for the record of the recovery member, which the device never saves. */
const memorySaver = (): RecordSaver => ({ save: async () => {} });

/** Removes a member with a rekey. A removed owner also gets a new signing key in the chain. */
export async function removeMember(
  relay: RelayClient,
  keyStore: KeyStore,
  record: DeviceRecord,
  memberId: string
): Promise<DeviceRecord> {
  const session = await openSession(relay, keyStore, record);
  const keys = await ownerKeys(session);
  const target = session.header.keyring.find(member => member.id === memberId);
  // A new recovery code replaces the recovery member
  const recoveryId = lookupCopyOf(keys.lookupCopy)?.memberId;
  if (!target || memberId === record.memberId || memberId === recoveryId)
    throw new VaultError('member');
  const written = await writeRekeyed(relay, keyStore, session, keys, {
    remove: [memberId],
    rotateSigning: target.role === 'owner',
  });
  if (!written) throw changed();
  return written.record;
}

/**
 * Removes a member. After an owner device, it makes a new recovery code, because that device can
 * know the old one. The code is null for a reader.
 */
export async function removeDevice(
  relay: RelayClient,
  keyStore: KeyStore,
  record: DeviceRecord,
  memberId: string
): Promise<{ record: DeviceRecord; recoveryCode: string | null }> {
  const session = await openSession(relay, keyStore, record);
  const role = session.header.keyring.find(member => member.id === memberId)?.role;
  const next = await removeMember(relay, keyStore, session.record, memberId);
  if (role !== 'owner') return { record: next, recoveryCode: null };
  return newRecoveryCode(relay, keyStore, next);
}

export interface DeviceEntry extends MemberName {
  kind: 'this' | 'recovery' | 'other';
}

/** The members of the vault, with their names, for the device list of an owner device. */
export async function listMembers(
  relay: RelayClient,
  keyStore: KeyStore,
  record: DeviceRecord
): Promise<DeviceEntry[]> {
  const session = await openSession(relay, keyStore, record);
  const keys = await ownerKeys(session);
  const recoveryId = lookupCopyOf(keys.lookupCopy)?.memberId;
  return (await memberNames(session)).map(member => ({
    ...member,
    kind: member.id === record.memberId ? 'this' : member.id === recoveryId ? 'recovery' : 'other',
  }));
}

/** Removes this device from the vault with a rekey, then deletes its record. The days stay. */
export async function leaveVault(
  relay: RelayClient,
  keyStore: KeyStore,
  record: DeviceRecord
): Promise<void> {
  let session: Awaited<ReturnType<typeof openSession>>;
  try {
    session = await openSession(relay, keyStore, record);
  } catch (error) {
    if (!isOutOfVault(error)) throw error;
    await keyStore.clear();
    return;
  }
  const keys = await ownerKeys(session);
  // The record of the rekey is of a removed member: the device does not save it
  const written = await writeRekeyed(relay, memorySaver(), session, keys, {
    remove: [record.memberId],
    rotateSigning: true,
  });
  if (!written) throw changed();
  await keyStore.clear();
}

/** Replaces the recovery member and the lookup object. Gives the new code. */
export async function newRecoveryCode(
  relay: RelayClient,
  keyStore: KeyStore,
  record: DeviceRecord
): Promise<{ record: DeviceRecord; recoveryCode: string }> {
  const session = await openSession(relay, keyStore, record);
  const keys = await ownerKeys(session);
  const old = lookupCopyOf(keys.lookupCopy);
  if (!old) throw new VaultError('keys');
  const { vaultId } = record;
  const secret = newRecoverySecret();
  const values = await deriveRecoveryValues(secret);
  const pair = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']);
  const recoveryId = newId(8);
  const lookupObject = JSON.stringify(
    await wrapWithKey(utf8(vaultId), values.lookupKey, lookupObjectContext(values.lookupId))
  );
  const created = await relay.putRecovery(
    values.lookupId,
    record.token,
    vaultId,
    lookupObject,
    null
  );
  if (!created.ok) throw new VaultError('relay', created);
  const privateKey = toBase64Url(
    new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  );
  const recoveryBlob = async (signingPublicKey: string, counter: number): Promise<SealedBytes> =>
    wrapWithKey(
      utf8(JSON.stringify({ privateKey, signingPublicKey, counter })),
      values.wrappingKey,
      recoveryBlobContext(vaultId, values.lookupId)
    );
  const written = await writeRekeyed(relay, keyStore, session, keys, {
    remove: [old.memberId],
    add: [
      {
        id: recoveryId,
        role: 'owner',
        publicKey: await rawPublicKey(pair.publicKey),
        tokenHash: await hashOf(values.accessToken),
      },
    ],
    rotateSigning: true,
    lookupCopy: utf8(
      JSON.stringify({ lookupId: values.lookupId, object: lookupObject, memberId: recoveryId })
    ),
    recoveryBlob,
  });
  if (!written) throw changed();
  await relay.deleteRecovery(old.lookupId, record.token);
  return { record: written.record, recoveryCode: await formatRecoveryCode(secret) };
}

/** Adds this device to the vault with the recovery code and its name, then makes a new code. */
export async function recoverWithCode(
  relay: RelayClient,
  keyStore: KeyStore,
  code: string,
  name: string
): Promise<{ record: DeviceRecord; recoveryCode: string }> {
  const secret = await parseRecoveryCode(code);
  if (!secret) throw new VaultError('code');
  const values = await deriveRecoveryValues(secret);
  const lookup = await relay.getRecovery(values.lookupId);
  if (!lookup.ok) throw new VaultError('relay', lookup);
  const vaultBytes = await unwrapWithKey(
    parseJson(lookup.text) as SealedBytes,
    values.lookupKey,
    lookupObjectContext(values.lookupId)
  ).catch(() => null);
  if (!vaultBytes) throw new VaultError('code');
  const vaultId = new TextDecoder().decode(vaultBytes);

  const vault = await relay.getVault(vaultId, values.accessToken);
  if (!vault.ok) throw new VaultError('relay', vault);
  const read = readVaultObject(vault.text);
  const tokenHash = await hashOf(values.accessToken);
  const entry = read?.header.keyring.find(member => member.tokenHash === tokenHash);
  if (!read?.header.recoveryBlob || !entry) throw new VaultError('removed');
  const blobBytes = await unwrapWithKey(
    read.header.recoveryBlob,
    values.wrappingKey,
    recoveryBlobContext(vaultId, values.lookupId)
  );
  const blob = blobBytes
    ? (parseJson(new TextDecoder().decode(blobBytes)) as Record<string, unknown> | undefined)
    : undefined;
  const pkcs8 = fromBase64Url(blob?.privateKey);
  if (!pkcs8 || typeof blob?.signingPublicKey !== 'string' || typeof blob.counter !== 'number')
    throw new VaultError('keys');
  const recoveryKey = await crypto.subtle
    .importKey('pkcs8', pkcs8, ECDH, false, ['deriveBits'])
    .catch(() => null);
  if (!recoveryKey) throw new VaultError('keys');

  const temporary = memorySaver();
  const session = await openSession(relay, temporary, {
    vaultId,
    memberId: entry.id,
    role: 'owner',
    token: values.accessToken,
    privateKey: recoveryKey,
    publicKey: entry.publicKey,
    trustedSigningKey: blob.signingPublicKey,
    last: { counter: blob.counter },
  });
  const keys = await ownerKeys(session);
  const device = await crypto.subtle.generateKey(ECDH, false, ['deriveBits']);
  const token = newId(32);
  const memberId = newId(8);
  const publicKey = await rawPublicKey(device.publicKey);
  // The recovery member has no lookup copy. The device gets one, so that it can make a new code
  // later when the new code below fails.
  const lookupCopy = utf8(
    JSON.stringify({ lookupId: values.lookupId, object: lookup.text, memberId: entry.id })
  );
  const member = await memberFor(
    session,
    { ...keys, lookupCopy },
    {
      id: memberId,
      role: 'owner',
      publicKey,
      tokenHash: await hashOf(token),
      name,
    }
  );
  const written = await writeSession(relay, temporary, session, {
    keyring: [...session.header.keyring, member],
  });
  if (!written) throw changed();
  const record: DeviceRecord = {
    vaultId,
    memberId,
    role: 'owner',
    token,
    privateKey: device.privateKey,
    publicKey,
    trustedSigningKey: written.record.trustedSigningKey,
    last: written.record.last,
  };
  await keyStore.save(record);
  // The lookup copy in the vault, not the values of the code: another owner can make a new code first
  return newRecoveryCode(relay, keyStore, record);
}
