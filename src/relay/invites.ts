/** The invite routes: the messages of one invitation between the new device and an owner. */
import type { RelayBucket } from './bucket';
import {
  CREATE_ONLY,
  bodyOf,
  fail,
  hasBytes,
  isId,
  isRecord,
  noContent,
  ok,
  ownerOf,
  parseJson,
  tokenHashOf,
} from './common';

export const INVITE_STEPS = ['request', 'offer', 'reveal', 'answer'] as const;
export type InviteStep = (typeof INVITE_STEPS)[number];

export const INVITE_LIFETIME_MS = 86_400_000;
export const MAX_MESSAGE_BYTES = 4096;
const TOKEN_HASH_BYTES = 32;

interface StoredInvite {
  etag: string;
  text: string;
  vaultId: string;
  created: string;
  messages: Record<string, unknown>;
}

/** The invitation, or null when it does not exist, is not valid or is more than 24 hours old. */
async function loadInvite(bucket: RelayBucket, id: string, now: Date) {
  const stored = await bucket.get(`invites/${id}`);
  if (!stored) return null;
  const { vaultId, created } = stored.customMetadata ?? {};
  const text = await stored.text();
  const messages = parseJson(text);
  const age = now.getTime() - Number(created);
  if (!isId(vaultId) || !(age >= 0 && age <= INVITE_LIFETIME_MS) || !isRecord(messages))
    return null;
  return { etag: stored.etag, text, vaultId, created: created as string, messages };
}

/** True when the token is the token of the join request. */
async function isNewDevice(invite: StoredInvite, request: Request) {
  const joined = invite.messages.request;
  const tokenHash = await tokenHashOf(request);
  return tokenHash !== null && isRecord(joined) && joined.tokenHash === tokenHash;
}

/** Null for the new device or an owner, else the error answer. */
async function memberOrNewDevice(bucket: RelayBucket, invite: StoredInvite, request: Request) {
  return (await isNewDevice(invite, request)) ? null : ownerOf(bucket, invite.vaultId, request);
}

export async function putInvite(bucket: RelayBucket, id: string, request: Request, now: Date) {
  const vaultId = request.headers.get('X-Vault-Id');
  if (!isId(vaultId)) return fail(400, 'invalid');
  const refused = await ownerOf(bucket, vaultId, request);
  if (refused) return refused;
  const key = `invites/${id}`;
  if (await bucket.head(key)) return fail(412, 'changed');
  const written = await bucket.put(key, '{}', {
    onlyIf: CREATE_ONLY,
    customMetadata: { vaultId, created: String(now.getTime()) },
  });
  return written ? ok('{}', written.etag) : fail(412, 'changed');
}

export async function getInvite(bucket: RelayBucket, id: string, request: Request, now: Date) {
  const invite = await loadInvite(bucket, id, now);
  if (!invite) return fail(404, 'notFound');
  const refused = await memberOrNewDevice(bucket, invite, request);
  return refused ?? ok(invite.text, invite.etag);
}

export async function deleteInvite(bucket: RelayBucket, id: string, request: Request, now: Date) {
  const invite = await loadInvite(bucket, id, now);
  if (!invite) return fail(404, 'notFound');
  const refused = await memberOrNewDevice(bucket, invite, request);
  if (refused) return refused;
  await bucket.delete(`invites/${id}`);
  return noContent();
}

/** Null when the token is of the sender of this message, else the error answer. */
async function senderCheck(
  bucket: RelayBucket,
  invite: StoredInvite,
  request: Request,
  step: InviteStep
) {
  if (step === 'request') return null;
  if (step === 'reveal') return (await isNewDevice(invite, request)) ? null : fail(401, 'token');
  return ownerOf(bucket, invite.vaultId, request);
}

export async function postInvite(
  bucket: RelayBucket,
  id: string,
  request: Request,
  now: Date,
  step: InviteStep
) {
  const text = await bodyOf(request, MAX_MESSAGE_BYTES);
  if (text === null) return fail(413, 'tooLarge');
  const message = parseJson(text);
  if (!isRecord(message)) return fail(400, 'invalid');
  const invite = await loadInvite(bucket, id, now);
  if (!invite) return fail(404, 'notFound');
  if (step === 'request' && !hasBytes(message.tokenHash, TOKEN_HASH_BYTES))
    return fail(400, 'invalid');
  const refused = await senderCheck(bucket, invite, request, step);
  if (refused) return refused;
  const index = INVITE_STEPS.indexOf(step);
  const before = INVITE_STEPS[index - 1];
  if (Object.hasOwn(invite.messages, step) || (before && !Object.hasOwn(invite.messages, before)))
    return fail(409, 'step');
  const written = await bucket.put(
    `invites/${id}`,
    JSON.stringify({ ...invite.messages, [step]: message }),
    {
      onlyIf: { etagMatches: invite.etag },
      customMetadata: { vaultId: invite.vaultId, created: invite.created },
    }
  );
  return written ? ok('{}', written.etag) : fail(412, 'changed');
}
