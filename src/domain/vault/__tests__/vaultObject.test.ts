import { describe, expect, it } from 'vitest';
import type { VaultDay } from '../../sync/vaultContent';
import { randomBytes, sha256, toBase64Url, utf8 } from '../bytes';
import { unwrapKey, wrapKey } from '../keyWrap';
import { extendSigningChain, newSigningChain } from '../signingChain';
import { decryptVaultDays, openVault, sealVault } from '../vaultObject';
import type { Member, OpenedVault, SealInput } from '../vaultObject';

const days: VaultDay[] = [
  { date: '2026-10-01', day: { bleeding: 'H' }, clock: { time: 5, counter: 0, member: 'phone' } },
];

const setup = async () => {
  const vaultId = toBase64Url(randomBytes(16));
  const keyId = toBase64Url(randomBytes(8));
  const rawKey = randomBytes(32);
  const dataKey = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
  const device = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);
  const signing = await newSigningChain();
  const memberId = toBase64Url(randomBytes(8));
  const member: Member = {
    id: memberId,
    role: 'owner',
    publicKey: toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', device.publicKey))),
    tokenHash: toBase64Url(await sha256(utf8('token'))),
    dataKey: await wrapKey(rawKey, device.publicKey, { vaultId, memberId, keyId, purpose: 'data' }),
  };
  const input: SealInput = {
    vaultId,
    keyId,
    counter: 1,
    keyring: [member],
    signingChain: signing.chain,
    earlierKeys: [],
    days,
    dataKey,
    signingKey: signing.privateKey,
  };
  const trusted = signing.chain[0]?.publicKey as string;
  return { input, vaultId, dataKey, device, signing, trusted, keyId, rawKey, memberId };
};

const opened = (result: Awaited<ReturnType<typeof openVault>>): OpenedVault => {
  if ('refused' in result) throw new Error(result.refused);
  return result;
};

describe('vault object', () => {
  it('seals the days, and a member opens and decrypts them', async () => {
    const { input, vaultId, trusted, device, keyId, rawKey, memberId } = await setup();
    const text = await sealVault(input);
    expect(text).not.toContain('2026-10-01');
    const vault = opened(
      await openVault(text, { vaultId, trustedSigningKey: trusted, last: null })
    );
    expect(vault.header.counter).toBe(1);
    expect(vault.signingKey).toBe(trusted);
    const member = vault.header.keyring[0] as Member;
    const key = await unwrapKey(member.dataKey, device.privateKey, {
      vaultId,
      memberId,
      keyId,
      purpose: 'data',
    });
    expect(key).toEqual(rawKey);
    const dataKey = await crypto.subtle.importKey(
      'raw',
      key as Uint8Array<ArrayBuffer>,
      'AES-GCM',
      false,
      ['decrypt']
    );
    expect(await decryptVaultDays(vault, dataKey)).toEqual(days);
    // The same object again is not a rollback
    expect(
      opened(
        await openVault(text, {
          vaultId,
          trustedSigningKey: trusted,
          last: { counter: 1, digest: vault.digest },
        })
      ).digest
    ).toBe(vault.digest);
  });

  it('accepts a new signing key that the chain reaches', async () => {
    const { input, vaultId, trusted, signing } = await setup();
    const next = await extendSigningChain(signing.chain, vaultId, signing.privateKey);
    const text = await sealVault({
      ...input,
      signingChain: next.chain,
      signingKey: next.privateKey,
    });
    const vault = opened(
      await openVault(text, { vaultId, trustedSigningKey: trusted, last: null })
    );
    expect(vault.signingKey).toBe(next.chain[1]?.publicKey);
  });

  it('refuses a vault that is not valid, of a different vault or with an untrusted key', async () => {
    const { input, vaultId, trusted } = await setup();
    const text = await sealVault(input);
    const check = { vaultId, trustedSigningKey: trusted, last: null };
    const object = JSON.parse(text);
    const header = JSON.parse(object.header);
    const withHeader = (change: Record<string, unknown>) =>
      JSON.stringify({ ...object, header: JSON.stringify({ ...header, ...change }) });
    const member = header.keyring[0];
    const invalid = [
      'not json',
      '[]',
      JSON.stringify({ ...object, header: 7 }),
      JSON.stringify({ ...object, header: 'not json' }),
      JSON.stringify({ ...object, ciphertext: '' }),
      JSON.stringify({ ...object, signature: 7 }),
      withHeader({ format: 2 }),
      withHeader({ vaultId: '' }),
      withHeader({ keyId: '%' }),
      withHeader({ counter: -1 }),
      withHeader({ counter: 1.5 }),
      withHeader({ counter: '1' }),
      withHeader({ iv: 7 }),
      withHeader({ keyring: null }),
      withHeader({ keyring: [{ ...member, role: 'admin' }] }),
      withHeader({ keyring: [{ ...member, id: 7 }] }),
      withHeader({ keyring: [{ ...member, publicKey: '' }] }),
      withHeader({ keyring: [{ ...member, tokenHash: '' }] }),
      withHeader({ keyring: [{ ...member, dataKey: { iv: 'AA', data: 'AA' } }] }),
      withHeader({ keyring: [{ ...member, dataKey: null }] }),
      withHeader({ keyring: [{ ...member, signingKey: { epk: 'AA' } }] }),
      withHeader({ keyring: [{ ...member, lookup: 'x' }] }),
      withHeader({ keyring: ['x'] }),
      withHeader({ signingChain: [] }),
      withHeader({ signingChain: 'x' }),
      withHeader({ signingChain: [{ ...header.signingChain[0], signature: 'AA' }] }),
      withHeader({ signingChain: [header.signingChain[0], { publicKey: 'AA' }] }),
      withHeader({ signingChain: [null] }),
      withHeader({ earlierKeys: null }),
      withHeader({ earlierKeys: [{ keyId: 'AA', key: null }] }),
      withHeader({ earlierKeys: [{ keyId: '', key: { iv: 'AA', data: 'AA' } }] }),
      withHeader({ earlierKeys: ['x'] }),
      withHeader({ recoveryBlob: 'x' }),
    ];
    for (const item of invalid)
      expect(await openVault(item, check)).toEqual({ refused: 'invalid' });
    expect(await openVault(text, { ...check, vaultId: 'other' })).toEqual({
      refused: 'wrongVault',
    });
    const other = await newSigningChain();
    expect(
      await openVault(text, { ...check, trustedSigningKey: other.chain[0]?.publicKey as string })
    ).toEqual({
      refused: 'untrusted',
    });
  });

  it('refuses a changed header or ciphertext, and a header with the optional fields stays valid', async () => {
    const { input, vaultId, trusted } = await setup();
    const check = { vaultId, trustedSigningKey: trusted, last: null };
    const object = JSON.parse(await sealVault(input));
    const header = JSON.parse(object.header);
    const changed = JSON.stringify({
      ...object,
      header: JSON.stringify({ ...header, counter: 9 }),
    });
    expect(await openVault(changed, check)).toEqual({ refused: 'badSignature' });
    const ciphertext = toBase64Url(randomBytes(32));
    expect(await openVault(JSON.stringify({ ...object, ciphertext }), check)).toEqual({
      refused: 'badSignature',
    });

    const full = await sealVault({
      ...input,
      earlierKeys: [{ keyId: 'AA', key: { iv: 'AA', data: 'AA' } }],
      recoveryBlob: { iv: 'AA', data: 'AA' },
      keyring: input.keyring.map(m => ({ ...m, signingKey: m.dataKey, lookup: m.dataKey })),
    });
    expect('refused' in (await openVault(full, check))).toBe(false);
  });

  it('refuses an older counter, and the same counter with a different content', async () => {
    const { input, vaultId, trusted } = await setup();
    const first = opened(
      await openVault(await sealVault(input), { vaultId, trustedSigningKey: trusted, last: null })
    );
    const last = { counter: 2, digest: first.digest };
    const check = { vaultId, trustedSigningKey: trusted, last };
    expect(await openVault(await sealVault(input), check)).toEqual({ refused: 'rollback' });
    expect(await openVault(await sealVault({ ...input, counter: 2 }), check)).toEqual({
      refused: 'rollback',
    });
    expect('refused' in (await openVault(await sealVault({ ...input, counter: 3 }), check))).toBe(
      false
    );
    // After a join or a recovery, the device has a signed counter without a digest
    const joined = { vaultId, trustedSigningKey: trusted, last: { counter: 2 } };
    expect('refused' in (await openVault(await sealVault({ ...input, counter: 2 }), joined))).toBe(
      false
    );
    expect(await openVault(await sealVault(input), joined)).toEqual({ refused: 'rollback' });
  });

  it('gives null days for a wrong data key or a content that is not vault days', async () => {
    const { input, vaultId, trusted } = await setup();
    const check = { vaultId, trustedSigningKey: trusted, last: null };
    const vault = opened(await openVault(await sealVault(input), check));
    const wrongKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'decrypt',
    ]);
    expect(await decryptVaultDays(vault, wrongKey)).toBeNull();

    // A vault whose plain text is not valid vault days
    const bad = opened(
      await openVault(
        await sealVault({
          ...input,
          days: [{ date: 'x', day: null, clock: { time: 0, counter: 0, member: 'a' } }],
        }),
        check
      )
    );
    expect(await decryptVaultDays(bad, input.dataKey)).toBeNull();

    // A plain text that is not padded gzip, encrypted with the right key and context
    const iv = randomBytes(12);
    const { vaultId: id, keyId, counter } = vault.header;
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: utf8(`fertility-tracker-vault:1:${id}:${keyId}:${counter}`),
        },
        input.dataKey,
        randomBytes(16384)
      )
    );
    const crafted = { ...vault, header: { ...vault.header, iv: toBase64Url(iv) }, ciphertext };
    expect(await decryptVaultDays(crafted, input.dataKey)).toBeNull();
  });
});
