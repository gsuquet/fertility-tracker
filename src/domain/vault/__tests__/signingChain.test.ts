import { describe, expect, it } from 'vitest';
import {
  currentSigningKey,
  extendSigningChain,
  importSigningPublicKey,
  newSigningChain,
} from '../signingChain';

describe('signingChain', () => {
  it('walks the chain from the trusted key to the current key', async () => {
    const first = await newSigningChain();
    const second = await extendSigningChain(first.chain, 'v', first.privateKey);
    const third = await extendSigningChain(second.chain, 'v', second.privateKey);
    const chain = third.chain;
    expect(chain).toHaveLength(3);
    expect(chain[0]?.signature).toBeUndefined();
    for (const trusted of chain) {
      expect((await currentSigningKey(chain, 'v', trusted.publicKey))?.publicKey).toBe(
        chain[2]?.publicKey
      );
    }
  });

  it('refuses an unknown trusted key, a wrong signature or a different vault', async () => {
    const first = await newSigningChain();
    const second = await extendSigningChain(first.chain, 'v', first.privateKey);
    const other = await newSigningChain();
    const trusted = first.chain[0]?.publicKey as string;
    expect(
      await currentSigningKey(second.chain, 'v', other.chain[0]?.publicKey as string)
    ).toBeNull();
    expect(await currentSigningKey(second.chain, 'w', trusted)).toBeNull();
    // A link that a different key signed
    const forged = await extendSigningChain(first.chain, 'v', other.privateKey);
    expect(await currentSigningKey(forged.chain, 'v', trusted)).toBeNull();
    const noSignature = [first.chain[0], { publicKey: second.chain[1]?.publicKey as string }];
    expect(await currentSigningKey(noSignature as typeof second.chain, 'v', trusted)).toBeNull();
    // A link with a public key that is not a point
    const badKey = [first.chain[0], { ...second.chain[1], publicKey: 'AAAA' }];
    expect(await currentSigningKey(badKey as typeof second.chain, 'v', trusted)).toBeNull();
  });

  it('imports a raw public key, or gives null', async () => {
    expect(await importSigningPublicKey('AAAA')).toBeNull();
    expect(await importSigningPublicKey('%')).toBeNull();
    expect(await currentSigningKey([{ publicKey: 'AAAA' }], 'v', 'AAAA')).toBeNull();
  });
});
