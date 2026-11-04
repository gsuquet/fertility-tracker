/** The relay of the encrypted sync: the routes in /api/ on an R2 bucket. See docs/reference/relay-api.md. */
import { fromBase64Url, sha256, toBase64Url, utf8 } from '../domain/vault/bytes';
import { readVaultObject } from '../domain/vault/vaultObject';
import type { Member } from '../domain/vault/vaultObject';
import type { RelayBucket } from './bucket';

export interface RelayEnv {
  VAULTS?: RelayBucket | undefined;
  RELAY_HOST?: string;
}

export const DEFAULT_RELAY_HOST = 'fertility-tracker.gsuquet.com';
export const MAX_VAULT_BYTES = 1_048_576;
export const MAX_RECOVERY_BYTES = 4096;
/** A new vault has few days. A low limit makes the storage of a stranger expensive. */
export const MAX_NEW_VAULT_BYTES = 262_144;
/** An update can add at most 64 KB to the stored vault, above the limit of a new vault. */
export const MAX_VAULT_GROWTH_BYTES = 65_536;

const ID_BYTES = 16;
const CREATE_ONLY = { etagDoesNotMatch: '*' };

const baseHeaders = (): Headers =>
  new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  });

const fail = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: baseHeaders() });

const ok = (body: string, etag: string) => {
  const headers = baseHeaders();
  headers.set('ETag', `"${etag}"`);
  return new Response(body, { status: 200, headers });
};

/** True for the base64url text of exactly 16 bytes, without extra bits. */
const isId = (value: string | null | undefined): value is string => {
  const bytes = fromBase64Url(value);
  return bytes?.length === ID_BYTES && toBase64Url(bytes) === value;
};

/** The ETag of an `If-Match` header, without `W/` and the quotes. */
const etagOf = (value: string) => value.replace(/^W\//, '').replaceAll('"', '');

const tokenHashOf = async (request: Request): Promise<string | null> => {
  const match = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') ?? '');
  return match ? toBase64Url(await sha256(utf8(match[1] as string))) : null;
};

const memberOf = (keyring: Member[], tokenHash: string | null) =>
  tokenHash === null ? undefined : keyring.find(member => member.tokenHash === tokenHash);

/** The body as text, or null when it is longer than the limit. */
const bodyOf = async (request: Request, limit: number): Promise<string | null> => {
  if (Number(request.headers.get('Content-Length') ?? 0) > limit) return null;
  const text = await request.text();
  return utf8(text).length > limit ? null : text;
};

/** The member of the stored vault for the token, or the error answer. */
async function storedMember(
  bucket: RelayBucket,
  vaultId: string,
  request: Request
): Promise<Member | Response> {
  const stored = await bucket.get(`vaults/${vaultId}`);
  const read = stored ? readVaultObject(await stored.text()) : null;
  const member = memberOf(read?.header.keyring ?? [], await tokenHashOf(request));
  return member ?? fail(401, 'token');
}

async function ownerOf(bucket: RelayBucket, vaultId: string, request: Request) {
  const member = await storedMember(bucket, vaultId, request);
  if (member instanceof Response) return member;
  return member.role === 'owner' ? null : fail(403, 'owner');
}

async function getVault(bucket: RelayBucket, vaultId: string, request: Request) {
  const stored = await bucket.get(`vaults/${vaultId}`);
  if (!stored) return fail(404, 'notFound');
  const text = await stored.text();
  const read = readVaultObject(text);
  if (!memberOf(read?.header.keyring ?? [], await tokenHashOf(request))) return fail(401, 'token');
  return ok(text, stored.etag);
}

async function putVault(bucket: RelayBucket, vaultId: string, request: Request, now: Date) {
  const text = await bodyOf(request, MAX_VAULT_BYTES);
  if (text === null) return fail(413, 'tooLarge');
  const read = readVaultObject(text);
  if (!read || read.header.vaultId !== vaultId) return fail(400, 'invalid');
  const ifMatch = request.headers.get('If-Match');
  const create = request.headers.get('If-None-Match') === '*';
  if (ifMatch === null && !create) return fail(428, 'condition');
  const key = `vaults/${vaultId}`;
  if (ifMatch === null) {
    // A new vault gets no history copy, so a stranger cannot double the storage
    if (utf8(text).length > MAX_NEW_VAULT_BYTES) return fail(413, 'tooLarge');
    if (await bucket.head(key)) return fail(412, 'changed');
    const caller = memberOf(read.header.keyring, await tokenHashOf(request));
    if (caller?.role !== 'owner') return fail(403, 'owner');
    const created = await bucket.put(key, text, { onlyIf: CREATE_ONLY });
    return created ? ok('{}', created.etag) : fail(412, 'changed');
  }
  const stored = await bucket.get(key);
  if (!stored) return fail(404, 'notFound');
  const storedText = await stored.text();
  const storedRead = readVaultObject(storedText);
  const caller = memberOf(storedRead?.header.keyring ?? [], await tokenHashOf(request));
  if (!storedRead || !caller) return fail(401, 'token');
  if (caller.role !== 'owner') return fail(403, 'owner');
  if (etagOf(ifMatch) !== stored.etag) return fail(412, 'changed');
  if (read.header.counter !== storedRead.header.counter + 1) return fail(409, 'counter');
  const limit = Math.max(MAX_NEW_VAULT_BYTES, utf8(storedText).length + MAX_VAULT_GROWTH_BYTES);
  if (utf8(text).length > limit) return fail(413, 'tooLarge');
  const written = await bucket.put(key, text, { onlyIf: { etagMatches: stored.etag } });
  if (!written) return fail(412, 'changed');
  const historyKey = `history/${vaultId}/${now.toISOString().slice(0, 10)}`;
  if (!(await bucket.head(historyKey))) await bucket.put(historyKey, text, { onlyIf: CREATE_ONLY });
  return ok('{}', written.etag);
}

async function getRecovery(bucket: RelayBucket, lookupId: string) {
  const stored = await bucket.get(`recovery/${lookupId}`);
  return stored ? ok(await stored.text(), stored.etag) : fail(404, 'notFound');
}

async function putRecovery(bucket: RelayBucket, lookupId: string, request: Request) {
  const text = await bodyOf(request, MAX_RECOVERY_BYTES);
  if (text === null) return fail(413, 'tooLarge');
  const vaultId = request.headers.get('X-Vault-Id');
  if (!isId(vaultId)) return fail(400, 'invalid');
  const refused = await ownerOf(bucket, vaultId, request);
  if (refused) return refused;
  const ifMatch = request.headers.get('If-Match');
  const create = request.headers.get('If-None-Match') === '*';
  if (ifMatch === null && !create) return fail(428, 'condition');
  const key = `recovery/${lookupId}`;
  const existing = await bucket.head(key);
  let onlyIf: { etagMatches?: string; etagDoesNotMatch?: string } = CREATE_ONLY;
  if (ifMatch === null) {
    if (existing) return fail(412, 'changed');
  } else {
    if (!existing) return fail(404, 'notFound');
    if (existing.customMetadata?.vaultId !== vaultId) return fail(403, 'owner');
    if (etagOf(ifMatch) !== existing.etag) return fail(412, 'changed');
    onlyIf = { etagMatches: existing.etag };
  }
  const written = await bucket.put(key, text, { onlyIf, customMetadata: { vaultId } });
  return written ? ok('{}', written.etag) : fail(412, 'changed');
}

async function deleteRecovery(bucket: RelayBucket, lookupId: string, request: Request) {
  const key = `recovery/${lookupId}`;
  const existing = await bucket.head(key);
  if (!existing) return fail(404, 'notFound');
  const refused = await ownerOf(bucket, existing.customMetadata?.vaultId ?? '', request);
  if (refused) return refused;
  await bucket.delete(key);
  const headers = baseHeaders();
  headers.delete('Content-Type');
  return new Response(null, { status: 204, headers });
}

const METHODS = {
  vaults: ['GET', 'PUT'],
  recovery: ['GET', 'PUT', 'DELETE'],
};

/** Answers one request to the relay. */
export async function handleRelay(
  request: Request,
  env: RelayEnv,
  now: Date = new Date()
): Promise<Response> {
  const url = new URL(request.url);
  if (url.hostname !== (env.RELAY_HOST ?? DEFAULT_RELAY_HOST)) return fail(403, 'host');
  const bucket = env.VAULTS;
  if (!bucket) return fail(503, 'unavailable');
  const match = /^\/api\/(vaults|recovery)\/([^/]+)$/.exec(url.pathname);
  if (!match) return fail(404, 'notFound');
  const [, kind, id] = match as unknown as [string, keyof typeof METHODS, string];
  if (!METHODS[kind].includes(request.method)) return fail(405, 'method');
  if (!isId(id)) return fail(400, 'invalid');
  if (kind === 'vaults')
    return request.method === 'GET'
      ? getVault(bucket, id, request)
      : putVault(bucket, id, request, now);
  if (request.method === 'GET') return getRecovery(bucket, id);
  return request.method === 'PUT'
    ? putRecovery(bucket, id, request)
    : deleteRecovery(bucket, id, request);
}
