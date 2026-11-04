/** The invitation on the owner device and on the new device. See docs/reference/sync-client.md. */
import { randomBytes, sha256, toBase64Url, utf8 } from '../domain/vault/bytes';
import {
  checkAnswer,
  checkJoinRequest,
  checkReveal,
  confirmationCode,
  makeJoinRequest,
  makeOffer,
  makeReveal,
  newInvitation,
  signAnswer,
} from '../domain/vault/invitation';
import type {
  Answer,
  AnswerContent,
  Invitation,
  JoinRequest,
  Offer,
  Reveal,
} from '../domain/vault/invitation';
import type { Member } from '../domain/vault/vaultObject';
import { VaultError, memberFor, openSession, ownerKeys, writeSession } from './deviceVault';
import type { DeviceRecord, KeyStore } from './keyStore';
import type { RelayClient } from './relayClient';

export interface OwnerInvitation {
  invitation: Invitation;
  role: Member['role'];
}

interface Messages {
  request?: unknown;
  offer?: unknown;
  reveal?: unknown;
  answer?: unknown;
}

export type OwnerCheck =
  | { status: 'waiting' | 'expired' | 'refused' }
  | { status: 'confirm'; code: string; request: JoinRequest };

export interface JoinState {
  invitation: Invitation;
  request: JoinRequest;
  nonce: string;
  privateKey: CryptoKey;
  publicKey: string;
  token: string;
}

export type JoinCheck =
  | { status: 'waiting' | 'expired' | 'refused' }
  | { status: 'confirm'; code: string; offer: Offer }
  | { status: 'answered'; code: string; offer: Offer; content: AnswerContent };

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOffer = (value: unknown): value is Offer =>
  isRecord(value) &&
  typeof value.nonce === 'string' &&
  typeof value.vaultId === 'string' &&
  typeof value.signingPublicKey === 'string';

/** The messages of the invitation, or a status when the relay does not give them. */
async function messagesOf(relay: RelayClient, inviteId: string, token: string) {
  const result = await relay.getInvite(inviteId, token);
  if (!result.ok && result.status === 404) return 'expired' as const;
  if (!result.ok) throw new VaultError('relay', result);
  const messages: unknown = JSON.parse(result.text);
  return (isRecord(messages) ? messages : {}) as Messages;
}

const post = async (
  relay: RelayClient,
  inviteId: string,
  step: 'request' | 'offer' | 'reveal' | 'answer',
  message: unknown,
  token?: string
) => {
  const result = await relay.postInvite(inviteId, step, message, token);
  if (!result.ok) throw new VaultError('relay', result);
};

/** Makes an invitation on the relay. Only an owner can invite. */
export async function startInvitation(
  relay: RelayClient,
  record: DeviceRecord,
  role: Member['role']
): Promise<OwnerInvitation> {
  if (record.role !== 'owner') throw new VaultError('reader');
  const invitation = newInvitation();
  const result = await relay.putInvite(invitation.id, record.token, record.vaultId);
  if (!result.ok) throw new VaultError('relay', result);
  return { invitation, role };
}

/** One check of the invitation by the owner device. It sends the offer when the request is valid. */
export async function checkAsOwner(
  relay: RelayClient,
  record: DeviceRecord,
  owner: OwnerInvitation
): Promise<OwnerCheck> {
  const { invitation } = owner;
  const messages = await messagesOf(relay, invitation.id, record.token);
  if (messages === 'expired') return { status: 'expired' };
  if (messages.request === undefined) return { status: 'waiting' };
  const refuse = async (): Promise<OwnerCheck> => {
    await relay.deleteInvite(invitation.id, record.token);
    return { status: 'refused' };
  };
  if (!(await checkJoinRequest(invitation, messages.request))) return refuse();
  const request = messages.request as JoinRequest;
  if (messages.offer === undefined) {
    await post(
      relay,
      invitation.id,
      'offer',
      makeOffer(record.vaultId, record.trustedSigningKey),
      record.token
    );
    return { status: 'waiting' };
  }
  if (messages.reveal === undefined) return { status: 'waiting' };
  if (!isOffer(messages.offer) || !(await checkReveal(request, messages.reveal))) return refuse();
  const code = await confirmationCode(
    invitation,
    request,
    messages.offer,
    messages.reveal as Reveal
  );
  return { status: 'confirm', code, request };
}

/** After the user confirmed the codes: adds the member to the vault, then sends the signed answer. */
export async function approveInvitation(
  relay: RelayClient,
  keyStore: KeyStore,
  record: DeviceRecord,
  owner: OwnerInvitation,
  request: JoinRequest
): Promise<DeviceRecord> {
  const session = await openSession(relay, keyStore, record);
  const keys = await ownerKeys(session);
  const memberId = toBase64Url(randomBytes(8));
  const member = await memberFor(session, keys, {
    id: memberId,
    role: owner.role,
    publicKey: request.publicKey,
    tokenHash: request.tokenHash,
  });
  const written = await writeSession(relay, keyStore, session, {
    keyring: [...session.header.keyring, member],
  });
  if (!written) throw new VaultError('relay', { status: 412, error: 'changed' });
  const answer: Answer = await signAnswer(
    {
      vaultId: record.vaultId,
      inviteId: owner.invitation.id,
      memberId,
      role: owner.role,
      publicKey: request.publicKey,
      counter: written.header.counter,
    },
    keys.signingKey
  );
  await post(relay, owner.invitation.id, 'answer', answer, record.token);
  return written.record;
}

/** The new device makes its keys and its token, and sends the join request. */
export async function startJoin(relay: RelayClient, invitation: Invitation): Promise<JoinState> {
  const pair = await crypto.subtle.generateKey(ECDH, false, ['deriveBits']);
  const publicKey = toBase64Url(
    new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  );
  const token = toBase64Url(randomBytes(32));
  const tokenHash = toBase64Url(await sha256(utf8(token)));
  const { request, nonce } = await makeJoinRequest(invitation, publicKey, tokenHash);
  await post(relay, invitation.id, 'request', request);
  return { invitation, request, nonce, privateKey: pair.privateKey, publicKey, token };
}

/** One check of the invitation by the new device. It sends the reveal after the offer. */
export async function checkAsNewDevice(relay: RelayClient, join: JoinState): Promise<JoinCheck> {
  const { invitation, request, token } = join;
  const messages = await messagesOf(relay, invitation.id, token);
  if (messages === 'expired') return { status: 'expired' };
  if (messages.offer === undefined) return { status: 'waiting' };
  const { offer } = messages;
  if (!isOffer(offer)) return { status: 'refused' };
  const reveal = makeReveal(join.nonce);
  if (messages.reveal === undefined) await post(relay, invitation.id, 'reveal', reveal, token);
  const code = await confirmationCode(invitation, request, offer, reveal);
  if (messages.answer === undefined) return { status: 'confirm', code, offer };
  const content = await checkAnswer(messages.answer, invitation, request, offer);
  return content ? { status: 'answered', code, offer, content } : { status: 'refused' };
}

/** After the user confirmed the codes: reads the vault with the new keys and saves the device record. */
export async function finishJoin(
  relay: RelayClient,
  keyStore: KeyStore,
  join: JoinState,
  offer: Offer,
  content: AnswerContent
): Promise<DeviceRecord> {
  const record: DeviceRecord = {
    vaultId: content.vaultId,
    memberId: content.memberId,
    role: content.role,
    token: join.token,
    privateKey: join.privateKey,
    publicKey: join.publicKey,
    trustedSigningKey: offer.signingPublicKey,
    last: { counter: content.counter },
  };
  const session = await openSession(relay, keyStore, record);
  await relay.deleteInvite(join.invitation.id, join.token);
  return session.record;
}
