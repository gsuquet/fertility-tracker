/**
 * The signing key chain (ADR 0012). Each new signing public key has a signature by the key
 * before it. A member walks the chain from the newest key that it accepted to the current key.
 */
import { fromBase64Url, toBase64Url, utf8 } from './bytes';

export interface ChainLink {
  publicKey: string;
  /** The signature by the key of the link before. The first link has none. */
  signature?: string;
}

export const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const;
export const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

const linkText = (vaultId: string, index: number, publicKey: string) =>
  utf8(`fertility-tracker-chain:1:${vaultId}:${index}:${publicKey}`);

/** Imports a raw P-256 public key for ECDSA. Null when the bytes are not a valid point. */
export async function importSigningPublicKey(raw: string): Promise<CryptoKey | null> {
  const bytes = fromBase64Url(raw);
  if (!bytes) return null;
  try {
    return await crypto.subtle.importKey('raw', bytes, ECDSA, true, ['verify']);
  } catch {
    return null;
  }
}

const newKeyPair = async () => {
  const pair = await crypto.subtle.generateKey(ECDSA, true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { privateKey: pair.privateKey, publicKey: toBase64Url(raw) };
};

/** A new signing key pair and a chain of one link. */
export async function newSigningChain(): Promise<{ chain: ChainLink[]; privateKey: CryptoKey }> {
  const pair = await newKeyPair();
  return { chain: [{ publicKey: pair.publicKey }], privateKey: pair.privateKey };
}

/** A new signing key pair, added to the chain with a signature by the current private key. */
export async function extendSigningChain(
  chain: ChainLink[],
  vaultId: string,
  privateKey: CryptoKey
): Promise<{ chain: ChainLink[]; privateKey: CryptoKey }> {
  const pair = await newKeyPair();
  const signature = await crypto.subtle.sign(
    SIGN,
    privateKey,
    linkText(vaultId, chain.length, pair.publicKey)
  );
  return {
    chain: [
      ...chain,
      { publicKey: pair.publicKey, signature: toBase64Url(new Uint8Array(signature)) },
    ],
    privateKey: pair.privateKey,
  };
}

/**
 * The last public key of the chain, when each signature after the trusted key is correct. Null
 * when the trusted key is not in the chain or when one signature is not correct.
 */
export async function currentSigningKey(
  chain: ChainLink[],
  vaultId: string,
  trustedKey: string
): Promise<{ publicKey: string; key: CryptoKey } | null> {
  const start = chain.findIndex(link => link.publicKey === trustedKey);
  if (start < 0) return null;
  let key = await importSigningPublicKey(trustedKey);
  for (let index = start + 1; index < chain.length && key; index++) {
    const link = chain[index] as ChainLink;
    const signature = fromBase64Url(link.signature);
    if (!signature) return null;
    const valid = await crypto.subtle.verify(
      SIGN,
      key,
      signature,
      linkText(vaultId, index, link.publicKey)
    );
    key = valid ? await importSigningPublicKey(link.publicKey) : null;
  }
  return key ? { publicKey: (chain.at(-1) as ChainLink).publicKey, key } : null;
}
