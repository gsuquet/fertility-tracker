import { describe, expect, it } from 'vitest';
import { randomBytes, sha256, toBase64Url, utf8 } from '../../domain/vault/bytes';
import { newSigningChain } from '../../domain/vault/signingChain';
import { sealVault } from '../../domain/vault/vaultObject';
import type { Member } from '../../domain/vault/vaultObject';
import { createMemoryBucket } from '../../test/memoryBucket';
import { DEFAULT_RELAY_HOST, handleRelay } from '../handler';
import { INVITE_LIFETIME_MS, MAX_MESSAGE_BYTES } from '../invites';

const OWNER = 'owner-token';
const READER = 'reader-token';
const JOINER = 'joiner-token';
const START = new Date('2026-11-04T10:00:00Z');

const newId = (length = 16) => toBase64Url(randomBytes(length));
const hashOf = async (token: string) => toBase64Url(await sha256(utf8(token)));

const memberWith = async (token: string, role: Member['role']): Promise<Member> => ({
  id: newId(8),
  role,
  publicKey: newId(65),
  tokenHash: await hashOf(token),
  dataKey: { epk: newId(65), iv: newId(12), data: newId(48) },
});

const setup = async () => {
  const { bucket, objects } = createMemoryBucket();
  let now = START;
  const send = (path: string, init: RequestInit & { token?: string } = {}) => {
    const headers = new Headers(init.headers);
    if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
    return handleRelay(
      new Request(`https://${DEFAULT_RELAY_HOST}${path}`, { ...init, headers }),
      { VAULTS: bucket },
      now
    );
  };
  const vaultId = newId();
  const signing = await newSigningChain();
  const dataKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
  ]);
  const vault = await sealVault({
    vaultId,
    keyId: newId(8),
    counter: 1,
    keyring: [await memberWith(OWNER, 'owner'), await memberWith(READER, 'reader')],
    signingChain: signing.chain,
    earlierKeys: [],
    days: [],
    dataKey,
    signingKey: signing.privateKey,
  });
  objects.set(`vaults/${vaultId}`, { value: vault, etag: 'v1', customMetadata: {} });
  const inviteId = newId();
  const path = `/api/invites/${inviteId}`;
  const create = () =>
    send(path, { method: 'PUT', token: OWNER, headers: { 'X-Vault-Id': vaultId } });
  const post = (step: string, body: unknown, token?: string) =>
    send(`${path}/${step}`, {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...(token ? { token } : {}),
    });
  const request = { publicKey: 'AA', tokenHash: await hashOf(JOINER), nonceHash: 'AA', mac: 'AA' };
  return {
    bucket,
    objects,
    send,
    vaultId,
    inviteId,
    path,
    create,
    post,
    request,
    setNow: (date: Date) => {
      now = date;
    },
  };
};

const errorOf = async (response: Response) => ({
  status: response.status,
  ...((await response.json()) as { error?: string }),
});

describe('relay: invite routes', () => {
  it('passes the four messages in order between the new device and the owner', async () => {
    const { create, post, send, path, objects, inviteId, vaultId, request } = await setup();
    const created = await create();
    expect(created.status).toBe(200);
    expect(objects.get(`invites/${inviteId}`)?.customMetadata).toEqual({
      vaultId,
      created: String(START.getTime()),
    });
    expect((await post('request', request)).status).toBe(200);
    expect((await post('offer', { nonce: 'B' }, OWNER)).status).toBe(200);
    expect((await post('reveal', { nonce: 'C' }, JOINER)).status).toBe(200);
    expect((await post('answer', { content: 'D' }, OWNER)).status).toBe(200);
    for (const token of [OWNER, JOINER]) {
      const read = await send(path, { token });
      expect(read.status).toBe(200);
      expect(read.headers.get('Cache-Control')).toBe('no-store');
      expect(await read.json()).toEqual({
        request,
        offer: { nonce: 'B' },
        reveal: { nonce: 'C' },
        answer: { content: 'D' },
      });
    }
    // The metadata stays after each message
    expect(objects.get(`invites/${inviteId}`)?.customMetadata?.vaultId).toBe(vaultId);
    expect((await send(path, { method: 'DELETE', token: JOINER })).status).toBe(204);
    expect(await errorOf(await send(path, { token: OWNER }))).toEqual({
      status: 404,
      error: 'notFound',
    });
  });

  it('refuses a new invitation without a vault id, an owner token, or with an id in use', async () => {
    const { send, path, create, vaultId } = await setup();
    const put = (headers: Record<string, string>, token?: string) =>
      send(path, { method: 'PUT', headers, ...(token ? { token } : {}) });
    expect(await errorOf(await put({}, OWNER))).toEqual({ status: 400, error: 'invalid' });
    expect(await errorOf(await put({ 'X-Vault-Id': vaultId }))).toEqual({
      status: 401,
      error: 'token',
    });
    expect(await errorOf(await put({ 'X-Vault-Id': vaultId }, READER))).toEqual({
      status: 403,
      error: 'owner',
    });
    expect((await create()).status).toBe(200);
    expect(await errorOf(await create())).toEqual({ status: 412, error: 'changed' });
  });

  it('answers 412 when a different write occurs during the creation or a message', async () => {
    const { bucket, create, post, request } = await setup();
    const put = bucket.put.bind(bucket);
    const race = () => {
      bucket.put = async (key, value, options) => {
        await put(key, '{}', { customMetadata: options?.customMetadata ?? {} });
        return put(key, value, options);
      };
    };
    race();
    expect(await errorOf(await create())).toEqual({ status: 412, error: 'changed' });
    bucket.put = put;
    race();
    expect(await errorOf(await post('request', request))).toEqual({
      status: 412,
      error: 'changed',
    });
  });

  it('refuses a message that is too large, not an object, or for an invitation that does not exist', async () => {
    const { create, post, request } = await setup();
    expect(await errorOf(await post('request', request))).toEqual({
      status: 404,
      error: 'notFound',
    });
    await create();
    expect(await errorOf(await post('request', 'x'.repeat(MAX_MESSAGE_BYTES + 1)))).toEqual({
      status: 413,
      error: 'tooLarge',
    });
    for (const body of ['not json', '[]', 'null'])
      expect(await errorOf(await post('request', body))).toEqual({
        status: 400,
        error: 'invalid',
      });
    for (const tokenHash of [undefined, 'AA', newId(31), 7])
      expect(await errorOf(await post('request', { ...request, tokenHash }))).toEqual({
        status: 400,
        error: 'invalid',
      });
  });

  it('accepts each message only from its sender, in order and one time', async () => {
    const { create, post, request } = await setup();
    await create();
    expect(await errorOf(await post('offer', {}, OWNER))).toEqual({ status: 409, error: 'step' });
    expect((await post('request', request)).status).toBe(200);
    expect(await errorOf(await post('request', request))).toEqual({ status: 409, error: 'step' });
    expect(await errorOf(await post('reveal', {}, JOINER))).toEqual({ status: 409, error: 'step' });
    expect(await errorOf(await post('offer', {}))).toEqual({ status: 401, error: 'token' });
    expect(await errorOf(await post('offer', {}, JOINER))).toEqual({ status: 401, error: 'token' });
    expect(await errorOf(await post('offer', {}, READER))).toEqual({ status: 403, error: 'owner' });
    expect((await post('offer', {}, OWNER)).status).toBe(200);
    expect(await errorOf(await post('answer', {}, OWNER))).toEqual({ status: 409, error: 'step' });
    expect(await errorOf(await post('reveal', {}, OWNER))).toEqual({ status: 401, error: 'token' });
    expect(await errorOf(await post('reveal', {}))).toEqual({ status: 401, error: 'token' });
    expect((await post('reveal', {}, JOINER)).status).toBe(200);
    expect(await errorOf(await post('answer', {}, JOINER))).toEqual({
      status: 401,
      error: 'token',
    });
    expect((await post('answer', {}, OWNER)).status).toBe(200);
    expect(await errorOf(await post('answer', {}, OWNER))).toEqual({ status: 409, error: 'step' });
  });

  it('gives the messages only to the new device and the owners', async () => {
    const { create, post, send, path, request } = await setup();
    await create();
    // Before the join request, only an owner can read
    expect(await errorOf(await send(path, { token: JOINER }))).toEqual({
      status: 401,
      error: 'token',
    });
    await post('request', request);
    expect(await errorOf(await send(path))).toEqual({ status: 401, error: 'token' });
    expect(await errorOf(await send(path, { token: 'other' }))).toEqual({
      status: 401,
      error: 'token',
    });
    expect(await errorOf(await send(path, { token: READER }))).toEqual({
      status: 403,
      error: 'owner',
    });
    expect(await errorOf(await send(path, { method: 'DELETE', token: READER }))).toEqual({
      status: 403,
      error: 'owner',
    });
    expect((await send(path, { method: 'DELETE', token: OWNER })).status).toBe(204);
    expect(await errorOf(await send(path, { method: 'DELETE', token: OWNER }))).toEqual({
      status: 404,
      error: 'notFound',
    });
  });

  it('stops an invitation after 24 hours', async () => {
    const { create, post, send, path, request, setNow } = await setup();
    await create();
    setNow(new Date(START.getTime() + INVITE_LIFETIME_MS));
    expect((await post('request', request)).status).toBe(200);
    setNow(new Date(START.getTime() + INVITE_LIFETIME_MS + 1));
    expect(await errorOf(await send(path, { token: OWNER }))).toEqual({
      status: 404,
      error: 'notFound',
    });
    // A clock before the creation time is not valid either
    setNow(new Date(START.getTime() - 1));
    expect((await send(path, { token: OWNER })).status).toBe(404);
  });

  it('refuses a stored invitation with metadata or messages that are not valid', async () => {
    const { objects, send, path, inviteId, vaultId } = await setup();
    const created = String(START.getTime());
    for (const [value, customMetadata] of [
      ['{}', {}],
      ['{}', { vaultId }],
      ['{}', { vaultId: 'x', created }],
      ['{}', { vaultId, created: 'x' }],
      ['[]', { vaultId, created }],
      ['not json', { vaultId, created }],
    ] as const) {
      objects.set(`invites/${inviteId}`, { value, etag: 'e', customMetadata });
      expect((await send(path, { token: OWNER })).status).toBe(404);
    }
    // An object without metadata, like an object that R2 gives without customMetadata
    objects.set(`invites/${inviteId}`, { value: '{}', etag: 'e', customMetadata: {} });
    expect((await send(path, { token: OWNER })).status).toBe(404);
  });

  it('answers 404 for an unknown message and 405 for a wrong method', async () => {
    const { send, path } = await setup();
    expect(await errorOf(await send(`${path}/other`, { method: 'POST' }))).toEqual({
      status: 404,
      error: 'notFound',
    });
    expect(await errorOf(await send(`/api/vaults/${newId()}/request`, { method: 'POST' }))).toEqual(
      { status: 404, error: 'notFound' }
    );
    expect(await errorOf(await send(`${path}/request`))).toEqual({ status: 405, error: 'method' });
    expect(await errorOf(await send(path, { method: 'POST' }))).toEqual({
      status: 405,
      error: 'method',
    });
    expect(await errorOf(await send(path, { method: 'toString' }))).toEqual({
      status: 405,
      error: 'method',
    });
  });
});
