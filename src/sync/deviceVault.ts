/** A new vault for this device, and the vault store of the sync engine. See docs/reference/sync-client.md. */
import type { VaultStore } from '../domain/sync/engine';
import type { VaultDay } from '../domain/sync/vaultContent';
import { randomBytes, sha256, toBase64Url, utf8 } from '../domain/vault/bytes';
import {
  lookupObjectContext,
  recoveryBlobContext,
  unwrapKey,
  wrapKey,
  wrapWithKey,
} from '../domain/vault/keyWrap';
import type { KeyContext } from '../domain/vault/keyWrap';
import {
  deriveRecoveryValues,
  formatRecoveryCode,
  newRecoverySecret,
} from '../domain/vault/recoveryCode';
import { ECDSA, newSigningChain } from '../domain/vault/signingChain';
import { decryptVaultDays, openVault, sealVault } from '../domain/vault/vaultObject';
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
  | 'noRead';

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
  const lookupCopy = utf8(JSON.stringify({ lookupId: recovery.lookupId, object: lookupObject }));
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

/** The vault store of the sync engine for the vault of the device record. */
export function vaultStoreOf(
  relay: RelayClient,
  keyStore: KeyStore,
  initial: DeviceRecord
): VaultStore {
  let record = initial;
  let lastRead: { header: VaultHeader; dataKey: CryptoKey; entry: Member } | null = null;

  const saveRecord = async (next: DeviceRecord) => {
    await keyStore.save(next);
    record = next;
  };

  return {
    async read() {
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
      const raw = await unwrapKey(
        entry.dataKey,
        record.privateKey,
        contextOf(record.vaultId, entry.id, opened.header.keyId, 'data')
      );
      if (!raw) throw new VaultError('keys');
      const dataKey = await importDataKey(raw);
      const days = await decryptVaultDays(opened, dataKey);
      if (!days) throw new VaultError('content');
      lastRead = { header: opened.header, dataKey, entry };
      await saveRecord({
        ...record,
        role: entry.role,
        trustedSigningKey: opened.signingKey,
        last: { counter: opened.header.counter, digest: opened.digest },
      });
      return { days, etag: result.etag as string };
    },

    async write(days: VaultDay[], etag: string | null) {
      if (!lastRead) throw new VaultError('noRead');
      const { header, dataKey, entry } = lastRead;
      if (entry.role !== 'owner' || !entry.signingKey) throw new VaultError('reader');
      const rawSigningKey = await unwrapKey(
        entry.signingKey,
        record.privateKey,
        contextOf(record.vaultId, entry.id, header.keyId, 'signing')
      );
      if (!rawSigningKey) throw new VaultError('keys');
      const signingKey = await crypto.subtle.importKey('pkcs8', rawSigningKey, ECDSA, false, [
        'sign',
      ]);
      const { format: _format, iv: _iv, ...fields } = header;
      const counter = header.counter + 1;
      const text = await sealVault({ ...fields, counter, days, dataKey, signingKey });
      const result = await relay.putVault(record.vaultId, record.token, text, etag);
      if (!result.ok && result.status === 412) return null;
      if (!result.ok) throw new VaultError('relay', result);
      lastRead = { ...lastRead, header: { ...header, counter } };
      await saveRecord({ ...record, last: { counter, digest: await digestOf(text) } });
      return result.etag as string;
    },
  };
}
