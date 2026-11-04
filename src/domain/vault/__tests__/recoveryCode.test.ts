import { describe, expect, it } from 'vitest';
import { fromBase64Url } from '../bytes';
import {
  deriveRecoveryValues,
  formatRecoveryCode,
  newRecoverySecret,
  parseRecoveryCode,
} from '../recoveryCode';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

describe('recovery code', () => {
  it('shows 27 characters in groups of 4, and reads them back', async () => {
    const secret = newRecoverySecret();
    expect(secret).toHaveLength(16);
    const code = await formatRecoveryCode(secret);
    expect(code).toMatch(
      /^[0-7][0-9A-HJKMNP-TV-Z]{3}(-[0-9A-HJKMNP-TV-Z]{4}){5}-[0-9A-HJKMNP-TV-Z]{3}$/
    );
    expect(await parseRecoveryCode(code)).toEqual(secret);
    expect(await parseRecoveryCode(` ${code.toLowerCase().replaceAll('-', ' ')} `)).toEqual(secret);
  });

  it('reads I and L as 1, and O as 0', async () => {
    const secret = new Uint8Array(16);
    secret[15] = 1;
    const code = await formatRecoveryCode(secret);
    expect(code.startsWith('0000-0000')).toBe(true);
    const typed = code.replace('0000-0000', 'OOOO-oooo').replace(/1(?=.)/, 'l');
    expect(await parseRecoveryCode(typed)).toEqual(secret);
    expect(await parseRecoveryCode(code.replace(/1(?=.)/, 'I'))).toEqual(secret);
  });

  it('finds a typing error with the check character', async () => {
    const secret = newRecoverySecret();
    const clean = (await formatRecoveryCode(secret)).replaceAll('-', '');
    let refused = 0;
    for (let i = 1; i < 26; i++) {
      const other = ALPHABET[(ALPHABET.indexOf(clean[i] as string) + 1) % 32] as string;
      if ((await parseRecoveryCode(clean.slice(0, i) + other + clean.slice(i + 1))) === null)
        refused++;
    }
    // The check character has 5 bits: one change in 32 can pass
    expect(refused).toBeGreaterThan(20);
    const wrongCheck =
      clean.slice(0, 26) + ALPHABET[(ALPHABET.indexOf(clean[26] as string) + 1) % 32];
    expect(await parseRecoveryCode(wrongCheck)).toBeNull();
  });

  it('gives null for a wrong length, a wrong character or a first value above 7', async () => {
    const clean = (await formatRecoveryCode(newRecoverySecret())).replaceAll('-', '');
    expect(await parseRecoveryCode(clean.slice(1))).toBeNull();
    expect(await parseRecoveryCode(`${clean}0`)).toBeNull();
    expect(await parseRecoveryCode(`U${clean.slice(1)}`)).toBeNull();
    expect(await parseRecoveryCode(`8${clean.slice(1)}`)).toBeNull();
  });

  it('derives four different values from the secret, the same each time', async () => {
    const secret = newRecoverySecret();
    const a = await deriveRecoveryValues(secret);
    const b = await deriveRecoveryValues(secret);
    expect(a.lookupId).toBe(b.lookupId);
    expect(a.accessToken).toBe(b.accessToken);
    expect(fromBase64Url(a.lookupId)).toHaveLength(16);
    expect(fromBase64Url(a.accessToken)).toHaveLength(32);
    expect(a.lookupId).not.toBe(a.accessToken.slice(0, 22));
    expect((await deriveRecoveryValues(newRecoverySecret())).lookupId).not.toBe(a.lookupId);

    // The two AES keys are different: a text of one key does not open with the other
    const iv = new Uint8Array(12);
    const sealed = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      a.lookupKey,
      new Uint8Array(4)
    );
    await expect(
      crypto.subtle.decrypt({ name: 'AES-GCM', iv }, b.lookupKey, sealed)
    ).resolves.toBeDefined();
    await expect(
      crypto.subtle.decrypt({ name: 'AES-GCM', iv }, a.wrappingKey, sealed)
    ).rejects.toThrow();
  });
});
