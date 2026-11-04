import { describe, expect, it } from 'vitest';
import { randomBytes } from '../bytes';
import {
  NO_ID,
  earlierKeyContext,
  importEcdhPublicKey,
  lookupObjectContext,
  recoveryBlobContext,
  unwrapKey,
  unwrapWithKey,
  wrapKey,
  wrapWithKey,
} from '../keyWrap';
import type { KeyContext } from '../keyWrap';

const context: KeyContext = { vaultId: 'v', memberId: 'm', keyId: 'k', purpose: 'data' };
const member = () =>
  crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);

describe('keyWrap', () => {
  it('wraps a key that only the member opens, in the same context', async () => {
    const alice = await member();
    const bob = await member();
    const key = randomBytes(32);
    const wrapped = await wrapKey(key, alice.publicKey, context);
    expect(await unwrapKey(wrapped, alice.privateKey, context)).toEqual(key);
    expect(await unwrapKey(wrapped, bob.privateKey, context)).toBeNull();
    for (const change of [
      { vaultId: 'w' },
      { memberId: 'n' },
      { keyId: 'l' },
      { purpose: 'signing' as const },
    ]) {
      expect(await unwrapKey(wrapped, alice.privateKey, { ...context, ...change })).toBeNull();
    }
  });

  it('gives null for a wrong ephemeral key, IV or data', async () => {
    const alice = await member();
    const wrapped = await wrapKey(randomBytes(32), alice.publicKey, context);
    expect(await unwrapKey({ ...wrapped, epk: 'AAAA' }, alice.privateKey, context)).toBeNull();
    expect(await unwrapKey({ ...wrapped, epk: '%' }, alice.privateKey, context)).toBeNull();
    expect(await unwrapKey({ ...wrapped, iv: 'AAAA' }, alice.privateKey, context)).toBeNull();
    expect(await unwrapKey({ ...wrapped, data: '%' }, alice.privateKey, context)).toBeNull();
    // A private key for a different algorithm cannot derive the shared secret
    const signing = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
    ]);
    expect(await unwrapKey(wrapped, signing.privateKey, context)).toBeNull();
  });

  it('wraps with an AES key that the device has', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    const bytes = randomBytes(10);
    const sealed = await wrapWithKey(bytes, key, { ...context, purpose: 'recovery' });
    expect(await unwrapWithKey(sealed, key, { ...context, purpose: 'recovery' })).toEqual(bytes);
    expect(await unwrapWithKey(sealed, key, context)).toBeNull();
  });

  it('gives fixed contexts without a key id or a member, and they do not open each other', async () => {
    expect(recoveryBlobContext('v', 'look')).toEqual({
      vaultId: 'v',
      memberId: 'look',
      keyId: NO_ID,
      purpose: 'recovery',
    });
    expect(earlierKeyContext('v', 'k1')).toEqual({
      vaultId: 'v',
      memberId: NO_ID,
      keyId: 'k1',
      purpose: 'earlier',
    });
    expect(lookupObjectContext('look')).toEqual({
      vaultId: NO_ID,
      memberId: 'look',
      keyId: NO_ID,
      purpose: 'lookup',
    });
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    const sealed = await wrapWithKey(randomBytes(4), key, lookupObjectContext('look'));
    expect(
      await unwrapWithKey(sealed, key, {
        vaultId: 'v',
        memberId: 'look',
        keyId: NO_ID,
        purpose: 'lookup',
      })
    ).toBeNull();
  });

  it('imports a raw public key, or gives null', async () => {
    expect(await importEcdhPublicKey('AAAA')).toBeNull();
    expect(await importEcdhPublicKey('%')).toBeNull();
  });
});
