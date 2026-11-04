import { describe, expect, it } from 'vitest';
import {
  decryptBackup,
  encryptBackup,
  MIN_PASSWORD_LENGTH,
  PBKDF2_ITERATIONS,
  parseEncryptedBackup,
} from '../encryptedBackup';

const PASSWORD = 'correct horse battery';
const PLAIN = JSON.stringify([{ date: '2026-10-24', stretch: '10', notes: 'secret note' }]);

const fromBase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

describe('encryptedBackup', () => {
  it('exports the password and iteration rules', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(PBKDF2_ITERATIONS).toBe(600000);
  });

  it('encrypts a backup that only the same password opens', async () => {
    const file = await encryptBackup(PLAIN, PASSWORD);
    expect(file).not.toContain('secret note');

    const backup = parseEncryptedBackup(file);
    expect(backup).not.toBeNull();
    expect(backup?.iterations).toBe(PBKDF2_ITERATIONS);
    expect(await decryptBackup(backup!, PASSWORD)).toBe(PLAIN);
    expect(await decryptBackup(backup!, 'wrong password!')).toBeNull();
  });

  it('writes the documented fields with a random salt and IV', async () => {
    const first = JSON.parse(await encryptBackup(PLAIN, PASSWORD));
    const second = JSON.parse(await encryptBackup(PLAIN, PASSWORD));

    expect(first.encryptedBackup).toBe(1);
    expect(first.kdf).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterations: 600000 });
    expect(first.cipher.name).toBe('AES-GCM');
    expect(fromBase64(first.kdf.salt)).toHaveLength(16);
    expect(fromBase64(first.cipher.iv)).toHaveLength(12);
    expect(first.kdf.salt).not.toBe(second.kdf.salt);
    expect(first.cipher.iv).not.toBe(second.cipher.iv);
  });

  it('pads the data to steps of 16 KB, so the size does not show the days', async () => {
    const small = JSON.parse(await encryptBackup('[]', PASSWORD));
    const bigger = JSON.parse(await encryptBackup(PLAIN.repeat(50), PASSWORD));
    // 16,384 bytes of padded plain text plus the 16-byte GCM tag
    expect(fromBase64(small.data)).toHaveLength(16384 + 16);
    expect(fromBase64(bigger.data)).toHaveLength(16384 + 16);
  });

  it('uses a second step of padding for a large backup', async () => {
    // Random hex text compresses to about half its size: more than 16 KB after gzip
    const bytes = crypto.getRandomValues(new Uint8Array(20000));
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const file = JSON.parse(await encryptBackup(hex, PASSWORD));
    expect(fromBase64(file.data)).toHaveLength(2 * 16384 + 16);
    expect(await decryptBackup(parseEncryptedBackup(JSON.stringify(file))!, PASSWORD)).toBe(hex);
  });

  it('fails when a byte of the data, the salt or the iterations changes', async () => {
    const file = JSON.parse(await encryptBackup(PLAIN, PASSWORD));

    const data = fromBase64(file.data);
    data[0] = (data[0] as number) ^ 1;
    const changedData = parseEncryptedBackup(JSON.stringify({ ...file, data: toBase64(data) }));
    expect(await decryptBackup(changedData!, PASSWORD)).toBeNull();

    const salt = fromBase64(file.kdf.salt);
    salt[0] = (salt[0] as number) ^ 1;
    const changedSalt = parseEncryptedBackup(
      JSON.stringify({ ...file, kdf: { ...file.kdf, salt: toBase64(salt) } })
    );
    expect(await decryptBackup(changedSalt!, PASSWORD)).toBeNull();

    const changedIterations = parseEncryptedBackup(
      JSON.stringify({ ...file, kdf: { ...file.kdf, iterations: 600001 } })
    );
    expect(await decryptBackup(changedIterations!, PASSWORD)).toBeNull();
  });

  it('gives null for text that is not an encrypted backup', () => {
    const valid = {
      encryptedBackup: 1,
      kdf: {
        name: 'PBKDF2',
        hash: 'SHA-256',
        iterations: 600000,
        salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
      },
      cipher: { name: 'AES-GCM', iv: 'AAAAAAAAAAAAAAAA' },
      data: 'AAAA',
    };
    expect(parseEncryptedBackup(JSON.stringify(valid))).not.toBeNull();

    const invalid: unknown[] = [
      'not json',
      '[]',
      'null',
      '"text"',
      { ...valid, encryptedBackup: 2 },
      { ...valid, kdf: null },
      { ...valid, kdf: { ...valid.kdf, name: 'scrypt' } },
      { ...valid, kdf: { ...valid.kdf, hash: 'SHA-1' } },
      { ...valid, kdf: { ...valid.kdf, iterations: 599999 } },
      { ...valid, kdf: { ...valid.kdf, iterations: 10000001 } },
      { ...valid, kdf: { ...valid.kdf, iterations: 600000.5 } },
      { ...valid, kdf: { ...valid.kdf, salt: 'AAAA' } },
      { ...valid, kdf: { ...valid.kdf, salt: 42 } },
      { ...valid, cipher: null },
      { ...valid, cipher: { ...valid.cipher, name: 'AES-CBC' } },
      { ...valid, cipher: { ...valid.cipher, iv: 'AAAA' } },
      { ...valid, cipher: { ...valid.cipher, iv: '%%%%' } },
      { ...valid, data: 7 },
      { ...valid, data: '' },
      { ...valid, data: 'not base64!' },
    ];
    for (const item of invalid) {
      const text = typeof item === 'string' ? item : JSON.stringify(item);
      expect(parseEncryptedBackup(text)).toBeNull();
    }
  });

  it('gives null when the decrypted data is not a padded gzip text', async () => {
    // A file that a different tool encrypted with the right key, but with a wrong length prefix
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const saltText = toBase64(salt);
    const base = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PASSWORD),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    const additionalData = new TextEncoder().encode(
      `fertility-tracker-encrypted-backup:1:${PBKDF2_ITERATIONS}:${saltText}`
    );
    const encryptPlain = async (plain: Uint8Array<ArrayBuffer>) =>
      toBase64(
        new Uint8Array(
          await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, plain)
        )
      );
    const fileWith = async (plain: Uint8Array<ArrayBuffer>) =>
      parseEncryptedBackup(
        JSON.stringify({
          encryptedBackup: 1,
          kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: saltText },
          cipher: { name: 'AES-GCM', iv: toBase64(iv) },
          data: await encryptPlain(plain),
        })
      )!;

    // The length says more bytes than the data holds
    const tooLong = new Uint8Array(16384);
    new DataView(tooLong.buffer).setUint32(0, 20000);
    expect(await decryptBackup(await fileWith(tooLong), PASSWORD)).toBeNull();

    // The bytes after the length are not gzip
    const notGzip = new Uint8Array(16384);
    new DataView(notGzip.buffer).setUint32(0, 10);
    notGzip.fill(7, 4, 14);
    expect(await decryptBackup(await fileWith(notGzip), PASSWORD)).toBeNull();
  });
});
