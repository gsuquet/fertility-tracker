/**
 * The recovery code (ADR 0012): 128 random bits in Crockford base32 with a check character.
 * HKDF derives the lookup id, the lookup key, the wrapping key and the access token from it.
 */
import { randomBytes, sha256, toBase64Url, utf8 } from './bytes';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SECRET_BYTES = 16;
const DATA_CHARACTERS = 26;
const GROUP = 4;

export const newRecoverySecret = (): Uint8Array<ArrayBuffer> => randomBytes(SECRET_BYTES);

/** The 26 data characters: the 128 bits with 2 zero bits first, 5 bits for each character. */
const toBase32 = (secret: Uint8Array): string => {
  let value = 0n;
  for (const byte of secret) value = (value << 8n) | BigInt(byte);
  let text = '';
  for (let i = DATA_CHARACTERS - 1; i >= 0; i--) {
    text += ALPHABET[Number((value >> BigInt(i * 5)) & 31n)];
  }
  return text;
};

const checkCharacter = async (secret: Uint8Array<ArrayBuffer>): Promise<string> =>
  ALPHABET[((await sha256(secret))[0] as number) >> 3] as string;

/** The code to show: 27 characters in groups of 4, with `-` between the groups. */
export async function formatRecoveryCode(secret: Uint8Array<ArrayBuffer>): Promise<string> {
  const text = toBase32(secret) + (await checkCharacter(secret));
  return (text.match(new RegExp(`.{1,${GROUP}}`, 'g')) as string[]).join('-');
}

/** The secret of a typed code, or null when the code is not valid. */
export async function parseRecoveryCode(text: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const clean = text.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (clean.length !== DATA_CHARACTERS + 1) return null;
  const values = [...clean].map(char => ALPHABET.indexOf(char));
  if (values.some(v => v < 0) || (values[0] as number) > 7) return null;
  let value = 0n;
  for (const v of values.slice(0, DATA_CHARACTERS)) value = (value << 5n) | BigInt(v);
  const secret = new Uint8Array(SECRET_BYTES);
  for (let i = SECRET_BYTES - 1; i >= 0; i--) {
    secret[i] = Number(value & 255n);
    value >>= 8n;
  }
  return clean.at(-1) === (await checkCharacter(secret)) ? secret : null;
}

export interface RecoveryValues {
  lookupId: string;
  lookupKey: CryptoKey;
  wrappingKey: CryptoKey;
  accessToken: string;
}

/** The four values of the code, with HKDF-SHA256 and the salt `fertility-tracker-recovery:1`. */
export async function deriveRecoveryValues(
  secret: Uint8Array<ArrayBuffer>
): Promise<RecoveryValues> {
  const base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, [
    'deriveBits',
    'deriveKey',
  ]);
  const params = (info: string) => ({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: utf8('fertility-tracker-recovery:1'),
    info: utf8(info),
  });
  const bits = async (info: string, length: number) =>
    new Uint8Array(await crypto.subtle.deriveBits(params(info), base, length * 8));
  const aesKey = (info: string) =>
    crypto.subtle.deriveKey(params(info), base, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
  return {
    lookupId: toBase64Url(await bits('lookup-id', 16)),
    lookupKey: await aesKey('lookup-key'),
    wrappingKey: await aesKey('wrapping-key'),
    accessToken: toBase64Url(await bits('access-token', 32)),
  };
}
