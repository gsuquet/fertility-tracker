/** The invitation that adds a member: the link, the messages, the 6-digit code and the signed answer. */
import { fromBase64Url, randomBytes, sha256, toBase64Url, utf8 } from './bytes';
import { SIGN, importSigningPublicKey } from './signingChain';
import type { Member } from './vaultObject';

export interface Invitation {
  id: string;
  secret: string;
}

export interface JoinRequest {
  publicKey: string;
  tokenHash: string;
  nonceHash: string;
  mac: string;
}

export interface Offer {
  nonce: string;
  vaultId: string;
  signingPublicKey: string;
}

export interface Reveal {
  nonce: string;
}

export interface AnswerContent {
  vaultId: string;
  inviteId: string;
  memberId: string;
  role: Member['role'];
  publicKey: string;
  counter: number;
}

export interface Answer {
  content: string;
  signature: string;
}

const ID_BYTES = 16;
const SECRET_BYTES = 32;
const NONCE_BYTES = 32;
const ANSWER_PREFIX = 'fertility-tracker-answer:1:';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && fromBase64Url(value) !== null;
/** True for the base64url text of exactly this number of bytes, without extra bits. */
const hasBytes = (value: string, length: number) => {
  const bytes = fromBase64Url(value);
  return bytes?.length === length && toBase64Url(bytes) === value;
};

export const newInvitation = (): Invitation => ({
  id: toBase64Url(randomBytes(ID_BYTES)),
  secret: toBase64Url(randomBytes(SECRET_BYTES)),
});

export const inviteLink = (appUrl: string, invitation: Invitation): string =>
  `${appUrl}#invite=${invitation.id}.${invitation.secret}`;

/** The invitation of a URL fragment, with or without `#`, or null. */
export function parseInviteFragment(hash: string): Invitation | null {
  const match = /^#?invite=([^.]+)\.([^.]+)$/.exec(hash);
  if (!match) return null;
  const [, id, secret] = match as unknown as [string, string, string];
  return hasBytes(id, ID_BYTES) && hasBytes(secret, SECRET_BYTES) ? { id, secret } : null;
}

const macKey = (invitation: Invitation, usage: KeyUsage) =>
  crypto.subtle.importKey(
    'raw',
    fromBase64Url(invitation.secret) as Uint8Array<ArrayBuffer>,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );

const macText = (inviteId: string, request: Omit<JoinRequest, 'mac'>) =>
  utf8(
    `fertility-tracker-join:1:${inviteId}:${request.publicKey}:${request.tokenHash}:${request.nonceHash}`
  );

/** The join request of the new device, and its nonce, which it keeps until the offer. */
export async function makeJoinRequest(
  invitation: Invitation,
  publicKey: string,
  tokenHash: string
): Promise<{ request: JoinRequest; nonce: string }> {
  const nonce = toBase64Url(randomBytes(NONCE_BYTES));
  const nonceHash = toBase64Url(await sha256(utf8(nonce)));
  const fields = { publicKey, tokenHash, nonceHash };
  const mac = await crypto.subtle.sign(
    'HMAC',
    await macKey(invitation, 'sign'),
    macText(invitation.id, fields)
  );
  return { request: { ...fields, mac: toBase64Url(new Uint8Array(mac)) }, nonce };
}

/** True when the fields are valid and the HMAC is of the secret of the invitation. */
export async function checkJoinRequest(invitation: Invitation, request: unknown): Promise<boolean> {
  if (
    !isRecord(request) ||
    !isText(request.publicKey) ||
    !isText(request.tokenHash) ||
    !isText(request.nonceHash) ||
    !isText(request.mac)
  )
    return false;
  const fields = request as unknown as JoinRequest;
  return crypto.subtle.verify(
    'HMAC',
    await macKey(invitation, 'verify'),
    fromBase64Url(fields.mac) as Uint8Array<ArrayBuffer>,
    macText(invitation.id, fields)
  );
}

export const makeOffer = (vaultId: string, signingPublicKey: string): Offer => ({
  nonce: toBase64Url(randomBytes(NONCE_BYTES)),
  vaultId,
  signingPublicKey,
});

export const makeReveal = (nonce: string): Reveal => ({ nonce });

/** True when the nonce of the reveal has the hash of the join request. */
export async function checkReveal(request: JoinRequest, reveal: unknown): Promise<boolean> {
  if (!isRecord(reveal) || typeof reveal.nonce !== 'string') return false;
  return toBase64Url(await sha256(utf8(reveal.nonce))) === request.nonceHash;
}

/** The 6-digit code that the two devices show. */
export async function confirmationCode(
  invitation: Invitation,
  request: JoinRequest,
  offer: Offer,
  reveal: Reveal
): Promise<string> {
  const text = [
    'fertility-tracker-code:1',
    invitation.id,
    invitation.secret,
    request.publicKey,
    offer.nonce,
    reveal.nonce,
    offer.vaultId,
    offer.signingPublicKey,
  ].join(':');
  const hash = await sha256(utf8(text));
  const value = new DataView(hash.buffer).getUint32(0);
  return String(value % 1_000_000).padStart(6, '0');
}

/** Signs the answer with the signing private key of the vault. */
export async function signAnswer(content: AnswerContent, signingKey: CryptoKey): Promise<Answer> {
  const text = JSON.stringify(content);
  const signature = await crypto.subtle.sign(SIGN, signingKey, utf8(`${ANSWER_PREFIX}${text}`));
  return { content: text, signature: toBase64Url(new Uint8Array(signature)) };
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** The content of a valid answer for this invitation, request and offer, or null. */
export async function checkAnswer(
  answer: unknown,
  invitation: Invitation,
  request: JoinRequest,
  offer: Offer
): Promise<AnswerContent | null> {
  if (!isRecord(answer) || typeof answer.content !== 'string') return null;
  const signature = fromBase64Url(answer.signature);
  const key = await importSigningPublicKey(offer.signingPublicKey);
  if (!signature || !key) return null;
  const valid = await crypto.subtle.verify(
    SIGN,
    key,
    signature,
    utf8(`${ANSWER_PREFIX}${answer.content}`)
  );
  const content = valid ? parseJson(answer.content) : undefined;
  if (
    !isRecord(content) ||
    content.vaultId !== offer.vaultId ||
    content.inviteId !== invitation.id ||
    content.publicKey !== request.publicKey ||
    !isText(content.memberId) ||
    (content.role !== 'owner' && content.role !== 'reader') ||
    typeof content.counter !== 'number' ||
    !Number.isSafeInteger(content.counter) ||
    content.counter < 0
  )
    return null;
  return content as unknown as AnswerContent;
}
