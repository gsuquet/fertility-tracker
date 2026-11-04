/** The answers, the ids, the tokens and the owner check that the routes of the relay share. */
import { fromBase64Url, sha256, toBase64Url, utf8 } from '../domain/vault/bytes';
import { readVaultObject } from '../domain/vault/vaultObject';
import type { Member } from '../domain/vault/vaultObject';
import type { RelayBucket } from './bucket';

export const ID_BYTES = 16;
export const CREATE_ONLY = { etagDoesNotMatch: '*' };

export const baseHeaders = (): Headers =>
  new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  });

export const fail = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: baseHeaders() });

export const ok = (body: string, etag: string) => {
  const headers = baseHeaders();
  headers.set('ETag', `"${etag}"`);
  return new Response(body, { status: 200, headers });
};

/** True for the base64url text of exactly 16 bytes, without extra bits. */
export const noContent = () => {
  const headers = baseHeaders();
  headers.delete('Content-Type');
  return new Response(null, { status: 204, headers });
};

export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** True for the base64url text of exactly this number of bytes, without extra bits. */
export const hasBytes = (value: unknown, length: number): value is string => {
  const bytes = fromBase64Url(value);
  return bytes?.length === length && toBase64Url(bytes) === value;
};

export const isId = (value: string | null | undefined): value is string =>
  hasBytes(value, ID_BYTES);

/** The ETag of an `If-Match` header, without `W/` and the quotes. */
export const etagOf = (value: string) => value.replace(/^W\//, '').replaceAll('"', '');

export const tokenHashOf = async (request: Request): Promise<string | null> => {
  const match = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') ?? '');
  return match ? toBase64Url(await sha256(utf8(match[1] as string))) : null;
};

export const memberOf = (keyring: Member[], tokenHash: string | null) =>
  tokenHash === null ? undefined : keyring.find(member => member.tokenHash === tokenHash);

/** The body as text, or null when it is longer than the limit. */
export const bodyOf = async (request: Request, limit: number): Promise<string | null> => {
  if (Number(request.headers.get('Content-Length') ?? 0) > limit) return null;
  const text = await request.text();
  return utf8(text).length > limit ? null : text;
};

/** The member of the stored vault for the token, or the error answer. */
export async function storedMember(
  bucket: RelayBucket,
  vaultId: string,
  request: Request
): Promise<Member | Response> {
  const stored = await bucket.get(`vaults/${vaultId}`);
  const read = stored ? readVaultObject(await stored.text()) : null;
  const member = memberOf(read?.header.keyring ?? [], await tokenHashOf(request));
  return member ?? fail(401, 'token');
}

export async function ownerOf(bucket: RelayBucket, vaultId: string, request: Request) {
  const member = await storedMember(bucket, vaultId, request);
  if (member instanceof Response) return member;
  return member.role === 'owner' ? null : fail(403, 'owner');
}
