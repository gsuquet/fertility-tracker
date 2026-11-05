import { describe, expect, it } from 'vitest';
import { randomBytes, utf8 } from '../bytes';
import { MAX_NAME_LENGTH, cleanDeviceName, openName, sealName } from '../deviceName';
import { wrapWithKey } from '../keyWrap';
import type { KeyContext } from '../keyWrap';

const dataKey = () =>
  crypto.subtle.importKey('raw', randomBytes(32), 'AES-GCM', false, ['encrypt', 'decrypt']);
const context: KeyContext = { vaultId: 'v', memberId: 'm', keyId: 'k', purpose: 'name' };

describe('device name', () => {
  it('keeps a name of 1 to 40 characters, without the spaces at the ends', () => {
    expect(MAX_NAME_LENGTH).toBe(40);
    expect(cleanDeviceName('  Phone of Gabriel  ')).toBe('Phone of Gabriel');
    expect(cleanDeviceName('x'.repeat(40))).toBe('x'.repeat(40));
    // The length counts code points: an emoji is one character
    expect(cleanDeviceName('📱'.repeat(40))).toBe('📱'.repeat(40));
    expect(cleanDeviceName('x'.repeat(41))).toBeNull();
    expect(cleanDeviceName('   ')).toBeNull();
    expect(cleanDeviceName('')).toBeNull();
  });

  it('encrypts the name with the data key and the context of the member', async () => {
    const key = await dataKey();
    const sealed = await sealName('Téléphone', key, context);
    expect(JSON.stringify(sealed)).not.toContain('phone');
    expect(await openName(sealed, key, context)).toBe('Téléphone');
    expect(await openName(undefined, key, context)).toBeNull();
    expect(await openName(sealed, await dataKey(), context)).toBeNull();
    expect(await openName(sealed, key, { ...context, memberId: 'other' })).toBeNull();
    // A name that decrypts but is not valid
    for (const text of ['', ' Phone', 'x'.repeat(41)])
      expect(await openName(await wrapWithKey(utf8(text), key, context), key, context)).toBeNull();
  });
});
