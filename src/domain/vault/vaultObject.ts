/**
 * The vault object (ADR 0012): a signed header, and the vault days encrypted with the data key.
 * A member refuses a vault with a wrong signature, an untrusted signing key or an older counter.
 */
import { parseVaultDays, serializeVaultDays } from '../sync/vaultContent';
import type { VaultDay } from '../sync/vaultContent';
import { fromBase64Url, randomBytes, sha256, toBase64Url, utf8 } from './bytes';
import type { SealedBytes, WrappedKey } from './keyWrap';
import { compressAndPad, unpadAndDecompress } from './paddedGzip';
import { SIGN, currentSigningKey } from './signingChain';
import type { ChainLink } from './signingChain';

export const VAULT_FORMAT = 1;

export interface Member {
  id: string;
  role: 'owner' | 'reader';
  publicKey: string;
  tokenHash: string;
  dataKey: WrappedKey;
  signingKey?: WrappedKey;
  lookup?: WrappedKey;
}

export interface EarlierKey {
  keyId: string;
  key: SealedBytes;
}

export interface VaultHeader {
  format: typeof VAULT_FORMAT;
  vaultId: string;
  keyId: string;
  counter: number;
  iv: string;
  keyring: Member[];
  signingChain: ChainLink[];
  earlierKeys: EarlierKey[];
  recoveryBlob?: SealedBytes;
}

export type SealInput = Omit<VaultHeader, 'format' | 'iv'> & {
  days: VaultDay[];
  dataKey: CryptoKey;
  signingKey: CryptoKey;
};

export interface OpenedVault {
  header: VaultHeader;
  ciphertext: Uint8Array<ArrayBuffer>;
  /** The last public key of the signing key chain. */
  signingKey: string;
  /** The SHA-256 of the object text, in base64url. */
  digest: string;
}

export type OpenRefusal = 'invalid' | 'wrongVault' | 'untrusted' | 'badSignature' | 'rollback';

export interface OpenCheck {
  vaultId: string;
  /** The newest signing public key that the device accepted. */
  trustedSigningKey: string;
  /**
   * The last counter and the digest of that object, or null before the first read. After a join
   * or a recovery, the device has a signed counter without a digest.
   */
  last: { counter: number; digest?: string } | null;
}

const IV_BYTES = 12;

const vaultAad = (vaultId: string, keyId: string, counter: number) =>
  utf8(`fertility-tracker-vault:${VAULT_FORMAT}:${vaultId}:${keyId}:${counter}`);

const signedBytes = (headerText: string, ciphertext: Uint8Array) => {
  const head = utf8(headerText);
  const bytes = new Uint8Array(head.length + 1 + ciphertext.length);
  bytes.set(head);
  bytes.set(ciphertext, head.length + 1);
  return bytes;
};

/** Encrypts the days with the data key and signs the header and the ciphertext. */
export async function sealVault(input: SealInput): Promise<string> {
  const { days, dataKey, signingKey, ...fields } = input;
  const iv = randomBytes(IV_BYTES);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: vaultAad(fields.vaultId, fields.keyId, fields.counter),
      },
      dataKey,
      await compressAndPad(serializeVaultDays(days))
    )
  );
  const header: VaultHeader = { format: VAULT_FORMAT, ...fields, iv: toBase64Url(iv) };
  const headerText = JSON.stringify(header);
  const signature = await crypto.subtle.sign(SIGN, signingKey, signedBytes(headerText, ciphertext));
  return JSON.stringify({
    header: headerText,
    ciphertext: toBase64Url(ciphertext),
    signature: toBase64Url(new Uint8Array(signature)),
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string =>
  typeof value === 'string' && fromBase64Url(value) !== null && value.length > 0;
const isSealed = (value: unknown): value is SealedBytes =>
  isRecord(value) && isText(value.iv) && isText(value.data);
const isWrapped = (value: unknown): value is WrappedKey =>
  isSealed(value) && isText((value as unknown as Record<string, unknown>).epk);
const isOptional = (value: unknown, check: (value: unknown) => boolean) =>
  value === undefined || check(value);

const isMember = (value: unknown): value is Member =>
  isRecord(value) &&
  isText(value.id) &&
  (value.role === 'owner' || value.role === 'reader') &&
  isText(value.publicKey) &&
  isText(value.tokenHash) &&
  isWrapped(value.dataKey) &&
  isOptional(value.signingKey, isWrapped) &&
  isOptional(value.lookup, isWrapped);

const isLink = (value: unknown, index: number): boolean =>
  isRecord(value) &&
  isText(value.publicKey) &&
  (index === 0 ? value.signature === undefined : isText(value.signature));

const isHeader = (value: unknown): value is VaultHeader =>
  isRecord(value) &&
  value.format === VAULT_FORMAT &&
  isText(value.vaultId) &&
  isText(value.keyId) &&
  typeof value.counter === 'number' &&
  Number.isSafeInteger(value.counter) &&
  value.counter >= 0 &&
  isText(value.iv) &&
  Array.isArray(value.keyring) &&
  value.keyring.every(isMember) &&
  Array.isArray(value.signingChain) &&
  value.signingChain.length > 0 &&
  value.signingChain.every(isLink) &&
  Array.isArray(value.earlierKeys) &&
  value.earlierKeys.every(key => isRecord(key) && isText(key.keyId) && isSealed(key.key)) &&
  isOptional(value.recoveryBlob, isSealed);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Checks the vault object. Gives the header and the ciphertext, or the reason of a refusal. */
export async function openVault(
  text: string,
  check: OpenCheck
): Promise<OpenedVault | { refused: OpenRefusal }> {
  const object = parseJson(text);
  if (!isRecord(object) || typeof object.header !== 'string') return { refused: 'invalid' };
  const header = parseJson(object.header);
  const ciphertext = fromBase64Url(object.ciphertext);
  const signature = fromBase64Url(object.signature);
  if (!isHeader(header) || !ciphertext?.length || !signature) return { refused: 'invalid' };
  if (header.vaultId !== check.vaultId) return { refused: 'wrongVault' };
  const current = await currentSigningKey(
    header.signingChain,
    header.vaultId,
    check.trustedSigningKey
  );
  if (!current) return { refused: 'untrusted' };
  const valid = await crypto.subtle.verify(
    SIGN,
    current.key,
    signature,
    signedBytes(object.header, ciphertext)
  );
  if (!valid) return { refused: 'badSignature' };
  const digest = toBase64Url(await sha256(utf8(text)));
  const { last } = check;
  if (
    last &&
    (header.counter < last.counter ||
      (header.counter === last.counter && last.digest !== undefined && digest !== last.digest))
  ) {
    return { refused: 'rollback' };
  }
  return { header, ciphertext, signingKey: current.publicKey, digest };
}

/** The vault days of an opened vault, or null when the data key or the content is wrong. */
export async function decryptVaultDays(
  opened: OpenedVault,
  dataKey: CryptoKey
): Promise<VaultDay[] | null> {
  const { vaultId, keyId, counter, iv } = opened.header;
  let padded: Uint8Array<ArrayBuffer>;
  try {
    padded = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: fromBase64Url(iv) as Uint8Array<ArrayBuffer>,
          additionalData: vaultAad(vaultId, keyId, counter),
        },
        dataKey,
        opened.ciphertext
      )
    );
  } catch {
    return null;
  }
  // A missing text gives undefined, which parseVaultDays() refuses as each value that is not a list
  return parseVaultDays(parseJson((await unpadAndDecompress(padded)) ?? ''));
}
