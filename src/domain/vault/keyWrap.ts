/**
 * Wrapped keys (ADR 0012). An owner device wraps the data key and the signing key for each
 * member with an ephemeral ECDH key, HKDF-SHA256 and AES-256-GCM. The additional data binds the
 * vault, the member, the key id and the purpose.
 */
import { fromBase64Url, randomBytes, toBase64Url, utf8 } from './bytes';

export type KeyPurpose = 'data' | 'signing' | 'lookup' | 'earlier' | 'recovery';

export interface KeyContext {
  vaultId: string;
  memberId: string;
  keyId: string;
  purpose: KeyPurpose;
}

export interface SealedBytes {
  iv: string;
  data: string;
}

export interface WrappedKey extends SealedBytes {
  epk: string;
}

/** The fixed value of a context field that has no member or no key id. */
export const NO_ID = '-';

/** The context of the recovery blob. The recovering device knows only the code and the vault id. */
export const recoveryBlobContext = (vaultId: string, lookupId: string): KeyContext => ({
  vaultId,
  memberId: lookupId,
  keyId: NO_ID,
  purpose: 'recovery',
});

/** The context of an earlier data key, encrypted with the current data key. */
export const earlierKeyContext = (vaultId: string, earlierKeyId: string): KeyContext => ({
  vaultId,
  memberId: NO_ID,
  keyId: earlierKeyId,
  purpose: 'earlier',
});

/** The context of the `recovery/<lookup id>` object, encrypted with the lookup key. */
export const lookupObjectContext = (lookupId: string): KeyContext => ({
  vaultId: NO_ID,
  memberId: lookupId,
  keyId: NO_ID,
  purpose: 'lookup',
});

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;
const IV_BYTES = 12;

const additionalData = (context: KeyContext) =>
  utf8(
    `fertility-tracker-key:1:${context.vaultId}:${context.memberId}:${context.keyId}:${context.purpose}`
  );

/** The AES-GCM key of an ECDH shared secret, with HKDF-SHA256. */
const sharedKey = async (privateKey: CryptoKey, publicKey: CryptoKey) => {
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
  const base = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: utf8('fertility-tracker-wrap:1'),
      info: new Uint8Array(),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/** Imports a raw P-256 public key for ECDH. Null when the bytes are not a valid point. */
export async function importEcdhPublicKey(raw: string): Promise<CryptoKey | null> {
  const bytes = fromBase64Url(raw);
  if (!bytes) return null;
  try {
    return await crypto.subtle.importKey('raw', bytes, ECDH, true, []);
  } catch {
    return null;
  }
}

/** Encrypts the bytes with an AES-GCM key that the device has. */
export async function wrapWithKey(
  bytes: Uint8Array<ArrayBuffer>,
  key: CryptoKey,
  context: KeyContext
): Promise<SealedBytes> {
  const iv = randomBytes(IV_BYTES);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(context) },
    key,
    bytes
  );
  return { iv: toBase64Url(iv), data: toBase64Url(new Uint8Array(data)) };
}

/** The bytes of `wrapWithKey()`, or null when the key, the context or the data is wrong. */
export async function unwrapWithKey(
  sealed: SealedBytes,
  key: CryptoKey,
  context: KeyContext
): Promise<Uint8Array<ArrayBuffer> | null> {
  const iv = fromBase64Url(sealed.iv);
  const data = fromBase64Url(sealed.data);
  if (iv?.length !== IV_BYTES || !data) return null;
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData: additionalData(context) },
        key,
        data
      )
    );
  } catch {
    return null;
  }
}

/** Encrypts the bytes for the member with this ECDH public key. */
export async function wrapKey(
  bytes: Uint8Array<ArrayBuffer>,
  publicKey: CryptoKey,
  context: KeyContext
): Promise<WrappedKey> {
  const ephemeral = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']);
  const key = await sharedKey(ephemeral.privateKey, publicKey);
  const epk = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));
  return { epk: toBase64Url(epk), ...(await wrapWithKey(bytes, key, context)) };
}

/** The bytes of `wrapKey()` for the member with this ECDH private key, or null. */
export async function unwrapKey(
  wrapped: WrappedKey,
  privateKey: CryptoKey,
  context: KeyContext
): Promise<Uint8Array<ArrayBuffer> | null> {
  const epk = await importEcdhPublicKey(wrapped.epk);
  if (!epk) return null;
  try {
    return await unwrapWithKey(wrapped, await sharedKey(privateKey, epk), context);
  } catch {
    return null;
  }
}
