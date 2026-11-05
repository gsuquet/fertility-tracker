import { describe, expect, it } from 'vitest';
import { fromBase64Url, randomBytes, sha256, toBase64Url, utf8 } from '../bytes';
import {
  checkAnswer,
  checkJoinRequest,
  checkReveal,
  confirmationCode,
  inviteLink,
  makeJoinRequest,
  makeOffer,
  makeReveal,
  newInvitation,
  parseInviteFragment,
  signAnswer,
} from '../invitation';
import type { AnswerContent, Invitation } from '../invitation';
import { newSigningChain } from '../signingChain';

const id = (length: number) => toBase64Url(randomBytes(length));

const flow = async () => {
  const invitation = newInvitation();
  const publicKey = id(65);
  const tokenHash = toBase64Url(await sha256(utf8('token')));
  const { request, nonce } = await makeJoinRequest(invitation, publicKey, tokenHash, 'Tablet');
  const signing = await newSigningChain();
  const vaultId = id(16);
  const offer = makeOffer(vaultId, signing.chain[0]?.publicKey as string);
  const reveal = makeReveal(nonce);
  const content: AnswerContent = {
    vaultId,
    inviteId: invitation.id,
    memberId: id(8),
    role: 'reader',
    publicKey,
    counter: 4,
  };
  return { invitation, request, offer, reveal, signing, content };
};

describe('invitation', () => {
  it('makes a link and reads it again', () => {
    const invitation = newInvitation();
    expect(invitation.id).toHaveLength(22);
    expect(invitation.secret).toHaveLength(43);
    const link = inviteLink('https://fertility-tracker.gsuquet.com/', invitation);
    expect(link).toBe(
      `https://fertility-tracker.gsuquet.com/#invite=${invitation.id}.${invitation.secret}`
    );
    expect(parseInviteFragment(new URL(link).hash)).toEqual(invitation);
    expect(parseInviteFragment(`invite=${invitation.id}.${invitation.secret}`)).toEqual(invitation);
  });

  it('refuses a fragment that is not an invitation', () => {
    const { id: inviteId, secret } = newInvitation();
    for (const hash of [
      '',
      '#',
      `#other=${inviteId}.${secret}`,
      `#invite=${inviteId}`,
      `#invite=${inviteId}.${secret}.x`,
      `#invite=${id(15)}.${secret}`,
      `#invite=${inviteId}.${id(31)}`,
      `#invite=%%.${secret}`,
      `#invite=${inviteId.slice(0, 21)}B.${secret}`,
    ])
      expect(parseInviteFragment(hash)).toBeNull();
  });

  it('checks the join request with the secret of the invitation', async () => {
    const { invitation, request } = await flow();
    expect(await checkJoinRequest(invitation, request)).toBe('Tablet');
    const other: Invitation = { ...invitation, secret: newInvitation().secret };
    expect(await checkJoinRequest(other, request)).toBeNull();
    expect(await checkJoinRequest({ ...invitation, id: id(16) }, request)).toBeNull();
    for (const change of [
      { publicKey: id(65) },
      { tokenHash: id(32) },
      { nonceHash: id(32) },
      { mac: id(32) },
      { mac: 7 },
      { publicKey: '' },
      { name: { ...request.name, data: id(30) } },
      { name: { ...request.name, iv: id(12) } },
      { name: { iv: 7, data: request.name.data } },
      { name: { iv: request.name.iv } },
      { name: 'x' },
    ])
      expect(await checkJoinRequest(invitation, { ...request, ...change } as never)).toBeNull();
    for (const value of [null, 'x', []])
      expect(await checkJoinRequest(invitation, value as never)).toBeNull();
  });

  it('encrypts the device name of the join request with the secret of the invitation', async () => {
    const invitation = newInvitation();
    const publicKey = id(65);
    const tokenHash = id(32);
    const { request } = await makeJoinRequest(invitation, publicKey, tokenHash, 'Ma tablette ✨');
    expect(JSON.stringify(request)).not.toContain('tablette');
    expect(await checkJoinRequest(invitation, request)).toBe('Ma tablette ✨');

    // A request with a valid HMAC, but a name that is not valid or that does not decrypt
    const macFor = async (name: { iv: string; data: string }) => {
      const key = await crypto.subtle.importKey(
        'raw',
        fromBase64Url(invitation.secret) as Uint8Array<ArrayBuffer>,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const text = [
        'fertility-tracker-join:1',
        invitation.id,
        publicKey,
        tokenHash,
        request.nonceHash,
        name.iv,
        name.data,
      ].join(':');
      return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(text))));
    };
    for (const name of [' Tablet', '', 'x'.repeat(41)]) {
      const sealed = (await makeJoinRequest(invitation, publicKey, tokenHash, name)).request;
      expect(await checkJoinRequest(invitation, sealed)).toBeNull();
    }
    const shortIv = { iv: id(8), data: request.name.data };
    expect(
      await checkJoinRequest(invitation, { ...request, name: shortIv, mac: await macFor(shortIv) })
    ).toBeNull();
    // The name of another public key does not decrypt
    const moved = (await makeJoinRequest(invitation, id(65), tokenHash, 'Tablet')).request.name;
    expect(
      await checkJoinRequest(invitation, { ...request, name: moved, mac: await macFor(moved) })
    ).toBeNull();
  });

  it('checks the nonce of the reveal against the hash of the request', async () => {
    const { request, reveal } = await flow();
    expect(await checkReveal(request, reveal)).toBe(true);
    expect(await checkReveal(request, makeReveal(id(32)))).toBe(false);
    expect(await checkReveal(request, { nonce: 7 } as never)).toBe(false);
    expect(await checkReveal(request, null as never)).toBe(false);
  });

  it('gives the same 6-digit code on the two devices, and a different code for a different value', async () => {
    const { invitation, request, offer, reveal } = await flow();
    const code = await confirmationCode(invitation, request, offer, reveal);
    expect(code).toMatch(/^\d{6}$/);
    expect(await confirmationCode(invitation, request, offer, reveal)).toBe(code);
    const others = [
      confirmationCode({ ...invitation, secret: newInvitation().secret }, request, offer, reveal),
      confirmationCode(invitation, { ...request, publicKey: id(65) }, offer, reveal),
      // A server with the link can encrypt another name: the code changes
      confirmationCode(
        invitation,
        { ...request, name: { ...request.name, data: id(30) } },
        offer,
        reveal
      ),
      confirmationCode(
        invitation,
        { ...request, name: { ...request.name, iv: id(12) } },
        offer,
        reveal
      ),
      confirmationCode(invitation, request, { ...offer, nonce: id(32) }, reveal),
      confirmationCode(invitation, request, offer, makeReveal(id(32))),
      confirmationCode(invitation, request, { ...offer, vaultId: id(16) }, reveal),
      confirmationCode(invitation, request, { ...offer, signingPublicKey: id(65) }, reveal),
    ];
    // A different 6-digit code has 1 chance in 1,000,000 to be the same
    for (const other of await Promise.all(others)) expect(other).not.toBe(code);
  });

  it('writes a small code with zeros first', async () => {
    // Find inputs whose code starts with 0, to check the padding
    const { invitation, request, offer } = await flow();
    let code = '';
    for (let i = 0; i < 200 && !code.startsWith('0'); i++)
      code = await confirmationCode(invitation, request, offer, makeReveal(id(32)));
    expect(code).toMatch(/^0\d{5}$/);
  });

  it('signs the answer, and the new device checks it', async () => {
    const { invitation, request, offer, signing, content } = await flow();
    const answer = await signAnswer(content, signing.privateKey);
    expect(await checkAnswer(answer, invitation, request, offer)).toEqual(content);
    expect(
      await checkAnswer(answer, invitation, request, { ...offer, signingPublicKey: 'x' })
    ).toBe(null);
    const other = await newSigningChain();
    const signedByOther = await signAnswer(content, other.privateKey);
    expect(await checkAnswer(signedByOther, invitation, request, offer)).toBeNull();
    expect(
      await checkAnswer(
        { ...answer, content: answer.content.replace('reader', 'owner') },
        invitation,
        request,
        offer
      )
    ).toBeNull();
  });

  it('refuses an answer for a different vault, invitation or key, or with fields that are not valid', async () => {
    const { invitation, request, offer, signing, content } = await flow();
    const changes: Record<string, unknown>[] = [
      { vaultId: id(16) },
      { inviteId: id(16) },
      { publicKey: id(65) },
      { role: 'admin' },
      { counter: -1 },
      { counter: 1.5 },
      { counter: '4' },
      { memberId: '' },
    ];
    for (const change of changes) {
      const answer = await signAnswer(
        { ...content, ...change } as AnswerContent,
        signing.privateKey
      );
      expect(await checkAnswer(answer, invitation, request, offer)).toBeNull();
    }
    const answer = await signAnswer(content, signing.privateKey);
    for (const bad of [
      null,
      { ...answer, signature: 7 },
      { ...answer, content: 7 },
      { ...answer, content: 'not json' },
      { ...answer, signature: '%' },
    ])
      expect(await checkAnswer(bad as never, invitation, request, offer)).toBeNull();
    // A signed content that is not JSON
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      signing.privateKey,
      utf8('fertility-tracker-answer:1:not json')
    );
    const notJson = { content: 'not json', signature: toBase64Url(new Uint8Array(signature)) };
    expect(await checkAnswer(notJson, invitation, request, offer)).toBeNull();
    const owner = { ...content, role: 'owner' as const };
    expect(
      await checkAnswer(await signAnswer(owner, signing.privateKey), invitation, request, offer)
    ).toEqual(owner);
  });
});
