/**
 * The encrypted backup file (ADR 0012, step 1). The browser makes an AES-256-GCM key from the
 * password with PBKDF2-SHA256, so the password and the key never leave the device. The plain
 * text is gzip-compressed and padded to steps of 16 KB, so the file size does not show how many
 * days the user recorded. Only WebCrypto and CompressionStream: no cryptography library.
 */

/** The shortest password that **Back up with a password** accepts. */
export const MIN_PASSWORD_LENGTH = 12;

/** The PBKDF2 iterations that the application writes, and the lowest that it reads. */
export const PBKDF2_ITERATIONS = 600000;

/** The highest iterations that the application reads: a higher value only makes the restore hang. */
const MAX_ITERATIONS = 10000000;

const FORMAT_VERSION = 1;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const LENGTH_BYTES = 4;
const PADDING_STEP = 16384;

/** The fields of an encrypted backup file that the decryption needs. */
export interface EncryptedBackup {
  iterations: number;
  salt: Uint8Array<ArrayBuffer>;
  saltText: string;
  iv: Uint8Array<ArrayBuffer>;
  data: Uint8Array<ArrayBuffer>;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** The bytes of a base64 text, or null when the text is not base64. */
const fromBase64 = (value: unknown): Uint8Array<ArrayBuffer> | null => {
  if (typeof value !== 'string') return null;
  try {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  } catch {
    return null;
  }
};

/** Binds the salt and the iterations to the ciphertext: a change of either makes the decryption fail. */
const additionalData = (iterations: number, saltText: string) =>
  new TextEncoder().encode(
    `fertility-tracker-encrypted-backup:${FORMAT_VERSION}:${iterations}:${saltText}`
  );

const deriveKey = async (password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) => {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/** Runs the bytes through a compression or decompression stream. */
const transform = async (bytes: Uint8Array<ArrayBuffer>, stream: TransformStream) => {
  const body = new Response(bytes).body as ReadableStream<Uint8Array>;
  return new Uint8Array(await new Response(body.pipeThrough(stream)).arrayBuffer());
};

/** The length in 4 bytes, the gzip data, then zero bytes to the next multiple of 16 KB. */
const pad = (compressed: Uint8Array): Uint8Array<ArrayBuffer> => {
  const used = LENGTH_BYTES + compressed.length;
  const padded = new Uint8Array(Math.ceil(used / PADDING_STEP) * PADDING_STEP);
  new DataView(padded.buffer).setUint32(0, compressed.length);
  padded.set(compressed, LENGTH_BYTES);
  return padded;
};

/** Encrypts the JSON text of a backup with the password. Gives the JSON text of the file. */
export async function encryptBackup(text: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const saltText = toBase64(salt);
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const compressed = await transform(new TextEncoder().encode(text), new CompressionStream('gzip'));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(PBKDF2_ITERATIONS, saltText) },
    key,
    pad(compressed)
  );
  return JSON.stringify({
    encryptedBackup: FORMAT_VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: saltText },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    data: toBase64(new Uint8Array(ciphertext)),
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads the fields of an encrypted backup file. Null when the text is not one. */
export function parseEncryptedBackup(text: string): EncryptedBackup | null {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(file) || file.encryptedBackup !== FORMAT_VERSION) return null;
  const { kdf, cipher } = file;
  if (!isRecord(kdf) || kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256') return null;
  if (!isRecord(cipher) || cipher.name !== 'AES-GCM') return null;
  const { iterations } = kdf;
  if (
    typeof iterations !== 'number' ||
    !Number.isInteger(iterations) ||
    iterations < PBKDF2_ITERATIONS ||
    iterations > MAX_ITERATIONS
  ) {
    return null;
  }
  const salt = fromBase64(kdf.salt);
  const iv = fromBase64(cipher.iv);
  const data = fromBase64(file.data);
  if (salt?.length !== SALT_BYTES || iv?.length !== IV_BYTES || !data?.length) return null;
  return { iterations, salt, saltText: kdf.salt as string, iv, data };
}

/**
 * Decrypts an encrypted backup with the password. Gives the JSON text of the backup, or null:
 * a wrong password and a changed file give the same result.
 */
export async function decryptBackup(
  backup: EncryptedBackup,
  password: string
): Promise<string | null> {
  try {
    const key = await deriveKey(password, backup.salt, backup.iterations);
    const padded = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: backup.iv,
          additionalData: additionalData(backup.iterations, backup.saltText),
        },
        key,
        backup.data
      )
    );
    const length = new DataView(padded.buffer).getUint32(0);
    if (LENGTH_BYTES + length > padded.length) return null;
    const compressed = padded.slice(LENGTH_BYTES, LENGTH_BYTES + length);
    const plain = await transform(compressed, new DecompressionStream('gzip'));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
