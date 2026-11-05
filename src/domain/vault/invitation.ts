/** The invitation that adds a member: the link, the messages, the 6-digit code and the signed answer. */
import { fromBase64Url, randomBytes, sha256, toBase64Url, utf8 } from './bytes';
import { cleanDeviceName } from './deviceName';
import type { SealedBytes } from './keyWrap';
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
  /** The device name, encrypted with a key from the secret of the invitation. */
  name: SealedBytes;
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
    [
      'fertility-tracker-join:1',
      inviteId,
      request.publicKey,
      request.tokenHash,
      request.nonceHash,
      request.name.iv,
      request.name.data,
    ].join(':')
  );

const NAME_LABEL = 'fertility-tracker-join-name:1';
const IV_BYTES = 12;

/** The AES-GCM key of the device name in the join request, from the secret of the invitation. */
const nameKey = async (invitation: Invitation) => {
  const base = await crypto.subtle.importKey(
    'raw',
    fromBase64Url(invitation.secret) as Uint8Array<ArrayBuffer>,
    'HKDF',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8(NAME_LABEL), info: utf8(invitation.id) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const nameData = (invitation: Invitation, publicKey: string) =>
  utf8(`${NAME_LABEL}:${invitation.id}:${publicKey}`);

/** The join request of the new device, and its nonce, which it keeps until the offer. */
export async function makeJoinRequest(
  invitation: Invitation,
  publicKey: string,
  tokenHash: string,
  name: string
): Promise<{ request: JoinRequest; nonce: string }> {
  const nonce = toBase64Url(randomBytes(NONCE_BYTES));
  const nonceHash = toBase64Url(await sha256(utf8(nonce)));
  const iv = randomBytes(IV_BYTES);
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: nameData(invitation, publicKey) },
    await nameKey(invitation),
    utf8(name)
  );
  const fields = {
    publicKey,
    tokenHash,
    nonceHash,
    name: { iv: toBase64Url(iv), data: toBase64Url(new Uint8Array(sealed)) },
  };
  const mac = await crypto.subtle.sign(
    'HMAC',
    await macKey(invitation, 'sign'),
    macText(invitation.id, fields)
  );
  return { request: { ...fields, mac: toBase64Url(new Uint8Array(mac)) }, nonce };
}

/** The device name of the request, after the HMAC of the secret, or null when a check fails. */
const nameOf = async (invitation: Invitation, request: JoinRequest): Promise<string | null> => {
  const iv = fromBase64Url(request.name.iv) as Uint8Array<ArrayBuffer>;
  if (iv.length !== IV_BYTES) return null;
  try {
    const bytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: nameData(invitation, request.publicKey) },
      await nameKey(invitation),
      fromBase64Url(request.name.data) as Uint8Array<ArrayBuffer>
    );
    const text = new TextDecoder().decode(bytes);
    return cleanDeviceName(text) === text ? text : null;
  } catch {
    return null;
  }
};

/**
 * The device name of the request when the fields are valid and the HMAC is of the secret of the
 * invitation. Else null.
 */
export async function checkJoinRequest(
  invitation: Invitation,
  request: unknown
): Promise<string | null> {
  if (
    !isRecord(request) ||
    !isText(request.publicKey) ||
    !isText(request.tokenHash) ||
    !isText(request.nonceHash) ||
    !isRecord(request.name) ||
    !isText(request.name.iv) ||
    !isText(request.name.data) ||
    !isText(request.mac)
  )
    return null;
  const fields = request as unknown as JoinRequest;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await macKey(invitation, 'verify'),
    fromBase64Url(fields.mac) as Uint8Array<ArrayBuffer>,
    macText(invitation.id, fields)
  );
  return valid ? nameOf(invitation, fields) : null;
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
    // A server with the link could encrypt another name: the code covers the name too
    request.name.iv,
    request.name.data,
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
