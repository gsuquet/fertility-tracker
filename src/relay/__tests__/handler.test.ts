import { describe, expect, it } from 'vitest';
import { createMemoryBucket } from '../../test/memoryBucket';
import { randomBytes, sha256, toBase64Url, utf8 } from '../../domain/vault/bytes';
import { newSigningChain } from '../../domain/vault/signingChain';
import { sealVault } from '../../domain/vault/vaultObject';
import type { Member } from '../../domain/vault/vaultObject';
import {
  DEFAULT_RELAY_HOST,
  MAX_NEW_VAULT_BYTES,
  MAX_RECOVERY_BYTES,
  MAX_VAULT_BYTES,
  MAX_VAULT_GROWTH_BYTES,
  handleRelay,
} from '../handler';
import type { RelayEnv } from '../handler';

const ORIGIN = `https://${DEFAULT_RELAY_HOST}`;
const OWNER = 'owner-token';
const READER = 'reader-token';

const newId = (length = 16) => toBase64Url(randomBytes(length));

const memberWith = async (token: string, role: Member['role']): Promise<Member> => ({
  id: newId(8),
  role,
  publicKey: newId(65),
  tokenHash: toBase64Url(await sha256(utf8(token))),
  dataKey: { epk: newId(65), iv: newId(12), data: newId(48) },
});

const vaultText = async (vaultId: string, counter: number, keyring?: Member[]) => {
  const signing = await newSigningChain();
  const dataKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
  ]);
  return sealVault({
    vaultId,
    keyId: newId(8),
    counter,
    keyring: keyring ?? [await memberWith(OWNER, 'owner'), await memberWith(READER, 'reader')],
    signingChain: signing.chain,
    earlierKeys: [],
    days: [],
    dataKey,
    signingKey: signing.privateKey,
  });
};

const setup = () => {
  const { bucket, objects } = createMemoryBucket();
  const env: RelayEnv = { VAULTS: bucket };
  const send = (path: string, init: RequestInit & { token?: string } = {}, origin = ORIGIN) => {
    const headers = new Headers(init.headers);
    if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
    return handleRelay(
      new Request(`${origin}${path}`, { ...init, headers }),
      env,
      new Date('2026-11-04T10:00:00Z')
    );
  };
  return { bucket, objects, env, send };
};

const errorOf = async (response: Response) => ({
  status: response.status,
  ...((await response.json()) as { error?: string }),
});

/** Makes a vault in the bucket, and gives its id and ETag. */
const created = async (send: ReturnType<typeof setup>['send']) => {
  const vaultId = newId();
  const response = await send(`/api/vaults/${vaultId}`, {
    method: 'PUT',
    token: OWNER,
    headers: { 'If-None-Match': '*' },
    body: await vaultText(vaultId, 1),
  });
  expect(response.status).toBe(200);
  return { vaultId, etag: response.headers.get('ETag') as string };
};

describe('relay: all routes', () => {
  it('refuses a different host, and answers 503 without the bucket', async () => {
    const { send, env } = setup();
    const other = await send('/api/vaults/x', {}, 'https://fertility-tracker.pages.dev');
    expect(await errorOf(other)).toEqual({ status: 403, error: 'host' });
    expect(other.headers.get('Cache-Control')).toBe('no-store');
    expect(other.headers.get('Content-Type')).toBe('application/json');
    env.RELAY_HOST = 'localhost';
    expect((await send('/api/recovery/x', {}, 'http://localhost:8788')).status).toBe(400);
    env.VAULTS = undefined;
    expect(await errorOf(await send('/api/vaults/x', {}, 'http://localhost:8788'))).toEqual({
      status: 503,
      error: 'unavailable',
    });
  });

  it('answers 404 for an unknown path, 405 for a wrong method and 400 for a wrong id', async () => {
    const { send } = setup();
    for (const path of ['/api/', '/api/other/x', '/api/vaults', '/api/vaults/a/b', '/index.html'])
      expect(await errorOf(await send(path))).toEqual({ status: 404, error: 'notFound' });
    const id = newId();
    expect(await errorOf(await send(`/api/vaults/${id}`, { method: 'DELETE' }))).toEqual({
      status: 405,
      error: 'method',
    });
    expect(await errorOf(await send(`/api/recovery/${id}`, { method: 'POST' }))).toEqual({
      status: 405,
      error: 'method',
    });
    // 15 bytes, 17 bytes, a text that is not base64url, and a text with extra bits
    for (const bad of [newId(15), newId(17), '%%%%', `${id.slice(0, 21)}B`])
      expect(await errorOf(await send(`/api/vaults/${bad}`))).toEqual({
        status: 400,
        error: 'invalid',
      });
  });
});

describe('relay: vault routes', () => {
  it('creates a vault, and gives it to each member', async () => {
    const { send, objects } = setup();
    const { vaultId, etag } = await created(send);
    expect(etag).toMatch(/^".+"$/);
    for (const token of [OWNER, READER]) {
      const response = await send(`/api/vaults/${vaultId}`, { token });
      expect(response.status).toBe(200);
      expect(response.headers.get('ETag')).toBe(etag);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.text()).toBe(objects.get(`vaults/${vaultId}`)?.value);
    }
    // A new vault gets no history copy
    expect(objects.has(`history/${vaultId}/2026-11-04`)).toBe(false);
  });

  it('refuses a read without the token of a member, or of a vault that does not exist', async () => {
    const { send, objects } = setup();
    const { vaultId } = await created(send);
    for (const token of [undefined, 'other'])
      expect(await errorOf(await send(`/api/vaults/${vaultId}`, token ? { token } : {}))).toEqual({
        status: 401,
        error: 'token',
      });
    expect(
      await errorOf(await send(`/api/vaults/${vaultId}`, { headers: { Authorization: OWNER } }))
    ).toEqual({ status: 401, error: 'token' });
    expect(await errorOf(await send(`/api/vaults/${newId()}`, { token: OWNER }))).toEqual({
      status: 404,
      error: 'notFound',
    });
    // A stored object that is not a vault object gives no member
    objects.set(`vaults/${vaultId}`, { value: 'x', etag: 'e', customMetadata: {} });
    expect((await send(`/api/vaults/${vaultId}`, { token: OWNER })).status).toBe(401);
  });

  it('refuses a new vault that is too large, not valid, without a condition or not of the caller', async () => {
    const { send } = setup();
    const vaultId = newId();
    const put = (body: string, headers: Record<string, string>, token = OWNER) =>
      send(`/api/vaults/${vaultId}`, { method: 'PUT', token, headers, body });
    const create = { 'If-None-Match': '*' };
    const text = await vaultText(vaultId, 1);
    expect(await errorOf(await put('x'.repeat(MAX_VAULT_BYTES + 1), create))).toEqual({
      status: 413,
      error: 'tooLarge',
    });
    expect(
      await errorOf(await put(text, { ...create, 'Content-Length': `${MAX_VAULT_BYTES + 1}` }))
    ).toEqual({ status: 413, error: 'tooLarge' });
    expect(await errorOf(await put('x', create))).toEqual({ status: 400, error: 'invalid' });
    // A valid vault object with spaces at the end is too large for a new vault
    expect(await errorOf(await put(`${text}${' '.repeat(MAX_NEW_VAULT_BYTES)}`, create))).toEqual({
      status: 413,
      error: 'tooLarge',
    });
    expect(await errorOf(await put(await vaultText(newId(), 1), create))).toEqual({
      status: 400,
      error: 'invalid',
    });
    expect(await errorOf(await put(text, {}))).toEqual({ status: 428, error: 'condition' });
    expect(await errorOf(await put(text, { 'If-None-Match': '"x"' }))).toEqual({
      status: 428,
      error: 'condition',
    });
    for (const token of [READER, 'other'])
      expect(await errorOf(await put(text, create, token))).toEqual({
        status: 403,
        error: 'owner',
      });
    expect((await put(text, create)).status).toBe(200);
    expect(await errorOf(await put(text, create))).toEqual({ status: 412, error: 'changed' });
  });

  it('updates a vault with the ETag and the next counter, for an owner only', async () => {
    const { send, objects } = setup();
    const { vaultId, etag } = await created(send);
    const put = async (counter: number, ifMatch: string, token = OWNER) =>
      send(`/api/vaults/${vaultId}`, {
        method: 'PUT',
        token,
        headers: { 'If-Match': ifMatch },
        body: await vaultText(vaultId, counter),
      });
    expect(await errorOf(await put(2, etag, 'other'))).toEqual({ status: 401, error: 'token' });
    expect(await errorOf(await put(2, etag, READER))).toEqual({ status: 403, error: 'owner' });
    expect(await errorOf(await put(2, '"old"'))).toEqual({ status: 412, error: 'changed' });
    for (const counter of [1, 3])
      expect(await errorOf(await put(counter, etag))).toEqual({ status: 409, error: 'counter' });
    const response = await put(2, etag);
    const history = objects.get(`history/${vaultId}/2026-11-04`)?.value;
    expect(history).toBe(objects.get(`vaults/${vaultId}`)?.value);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
    const next = response.headers.get('ETag') as string;
    expect(next).not.toBe(etag);
    // An ETag without quotes and a weak ETag are the same ETag
    expect((await put(3, next.replaceAll('"', ''))).status).toBe(200);
    // The first write of the day stays in the history
    expect(objects.get(`history/${vaultId}/2026-11-04`)?.value).toBe(history);
    expect(await errorOf(await put(2, etag))).toEqual({ status: 412, error: 'changed' });
    // A stored object that is not a vault object gives no member
    objects.set(`vaults/${vaultId}`, { value: 'x', etag: 'e', customMetadata: {} });
    expect(await errorOf(await put(4, '"e"'))).toEqual({ status: 401, error: 'token' });
    const missing = newId();
    expect(
      await errorOf(
        await send(`/api/vaults/${missing}`, {
          method: 'PUT',
          token: OWNER,
          headers: { 'If-Match': etag },
          body: await vaultText(missing, 2),
        })
      )
    ).toEqual({ status: 404, error: 'notFound' });
  });

  it('refuses an update that grows the vault too fast', async () => {
    const { send, objects } = setup();
    const { vaultId, etag } = await created(send);
    const put = async (body: string, ifMatch: string) =>
      send(`/api/vaults/${vaultId}`, {
        method: 'PUT',
        token: OWNER,
        headers: { 'If-Match': ifMatch },
        body,
      });
    const next = await vaultText(vaultId, 2);
    // Up to 256 KB, a small vault can grow
    const first = await put(`${next}${' '.repeat(MAX_NEW_VAULT_BYTES - next.length)}`, etag);
    expect(first.status).toBe(200);
    const stored = objects.get(`vaults/${vaultId}`)?.value.length as number;
    const third = await vaultText(vaultId, 3);
    const ifMatch = first.headers.get('ETag') as string;
    const grown = `${third}${' '.repeat(stored + MAX_VAULT_GROWTH_BYTES + 1 - third.length)}`;
    expect(await errorOf(await put(grown, ifMatch))).toEqual({ status: 413, error: 'tooLarge' });
    expect((await put(grown.slice(0, -1), ifMatch)).status).toBe(200);
  });

  it('answers 412 when a different write occurs during the creation', async () => {
    const { send, bucket } = setup();
    const vaultId = newId();
    const body = await vaultText(vaultId, 1);
    const put = bucket.put.bind(bucket);
    bucket.put = async (key, value, options) => {
      await put(key, 'other write');
      return put(key, value, options);
    };
    const response = await send(`/api/vaults/${vaultId}`, {
      method: 'PUT',
      token: OWNER,
      headers: { 'If-None-Match': '*' },
      body,
    });
    expect(await errorOf(response)).toEqual({ status: 412, error: 'changed' });
  });

  it('answers 412 when a different write occurs during the update', async () => {
    const { send, bucket } = setup();
    const { vaultId, etag } = await created(send);
    const body = await vaultText(vaultId, 2);
    const put = bucket.put.bind(bucket);
    bucket.put = async (key, value, options) => {
      await put(key, 'other write');
      return put(key, value, options);
    };
    const response = await send(`/api/vaults/${vaultId}`, {
      method: 'PUT',
      token: OWNER,
      headers: { 'If-Match': `W/${etag}` },
      body,
    });
    expect(await errorOf(response)).toEqual({ status: 412, error: 'changed' });
  });
});

describe('relay: recovery routes', () => {
  const lookup = JSON.stringify({ iv: 'AA', data: 'AA' });

  it('stores, reads, replaces and deletes a lookup object', async () => {
    const { send, objects } = setup();
    const { vaultId } = await created(send);
    const lookupId = newId();
    const path = `/api/recovery/${lookupId}`;
    const headers = { 'X-Vault-Id': vaultId, 'If-None-Match': '*' };
    const response = await send(path, { method: 'PUT', token: OWNER, headers, body: lookup });
    expect(response.status).toBe(200);
    expect(objects.get(`recovery/${lookupId}`)?.customMetadata).toEqual({ vaultId });
    const read = await send(path);
    expect(read.status).toBe(200);
    expect(await read.text()).toBe(lookup);
    expect(read.headers.get('Cache-Control')).toBe('no-store');
    const replaced = await send(path, {
      method: 'PUT',
      token: OWNER,
      headers: { 'X-Vault-Id': vaultId, 'If-Match': response.headers.get('ETag') as string },
      body: 'new',
    });
    expect(replaced.status).toBe(200);
    expect(await (await send(path)).text()).toBe('new');
    const deleted = await send(path, { method: 'DELETE', token: OWNER });
    expect(deleted.status).toBe(204);
    expect(deleted.headers.get('Cache-Control')).toBe('no-store');
    expect(await errorOf(await send(path))).toEqual({ status: 404, error: 'notFound' });
  });

  it('refuses a write that is too large, without a vault id, a condition or an owner token', async () => {
    const { send } = setup();
    const { vaultId } = await created(send);
    const path = `/api/recovery/${newId()}`;
    const put = (headers: Record<string, string>, token?: string, body = lookup) =>
      send(path, { method: 'PUT', headers, body, ...(token ? { token } : {}) });
    const create = { 'X-Vault-Id': vaultId, 'If-None-Match': '*' };
    expect(await errorOf(await put(create, OWNER, 'x'.repeat(MAX_RECOVERY_BYTES + 1)))).toEqual({
      status: 413,
      error: 'tooLarge',
    });
    expect(await errorOf(await put({ 'If-None-Match': '*' }, OWNER))).toEqual({
      status: 400,
      error: 'invalid',
    });
    expect(await errorOf(await put({ ...create, 'X-Vault-Id': 'x' }, OWNER))).toEqual({
      status: 400,
      error: 'invalid',
    });
    expect(await errorOf(await put(create))).toEqual({ status: 401, error: 'token' });
    expect(await errorOf(await put({ ...create, 'X-Vault-Id': newId() }, OWNER))).toEqual({
      status: 401,
      error: 'token',
    });
    expect(await errorOf(await put(create, READER))).toEqual({ status: 403, error: 'owner' });
    expect(await errorOf(await put({ 'X-Vault-Id': vaultId }, OWNER))).toEqual({
      status: 428,
      error: 'condition',
    });
    expect(await errorOf(await put({ 'X-Vault-Id': vaultId, 'If-Match': '"x"' }, OWNER))).toEqual({
      status: 404,
      error: 'notFound',
    });
    expect((await put(create, OWNER)).status).toBe(200);
    expect(await errorOf(await put(create, OWNER))).toEqual({ status: 412, error: 'changed' });
    expect(await errorOf(await put({ 'X-Vault-Id': vaultId, 'If-Match': '"x"' }, OWNER))).toEqual({
      status: 412,
      error: 'changed',
    });
  });

  it('answers 412 when a different write occurs during the creation', async () => {
    const { send, bucket } = setup();
    const { vaultId } = await created(send);
    const put = bucket.put.bind(bucket);
    bucket.put = async (key, value, options) => {
      await put(key, 'other write');
      return put(key, value, options);
    };
    const response = await send(`/api/recovery/${newId()}`, {
      method: 'PUT',
      token: OWNER,
      headers: { 'X-Vault-Id': vaultId, 'If-None-Match': '*' },
      body: lookup,
    });
    expect(await errorOf(response)).toEqual({ status: 412, error: 'changed' });
  });

  it('refuses a change by an owner of a different vault', async () => {
    const { send } = setup();
    const first = await created(send);
    const second = await created(send);
    const path = `/api/recovery/${newId()}`;
    const response = await send(path, {
      method: 'PUT',
      token: OWNER,
      headers: { 'X-Vault-Id': first.vaultId, 'If-None-Match': '*' },
      body: lookup,
    });
    const etag = response.headers.get('ETag') as string;
    expect(
      await errorOf(
        await send(path, {
          method: 'PUT',
          token: OWNER,
          headers: { 'X-Vault-Id': second.vaultId, 'If-Match': etag },
          body: lookup,
        })
      )
    ).toEqual({ status: 403, error: 'owner' });
  });

  it('refuses a change of an object without a vault id in its metadata', async () => {
    const { send, bucket } = setup();
    const { vaultId } = await created(send);
    const lookupId = newId();
    const written = await bucket.put(`recovery/${lookupId}`, lookup);
    const path = `/api/recovery/${lookupId}`;
    const put = await send(path, {
      method: 'PUT',
      token: OWNER,
      headers: { 'X-Vault-Id': vaultId, 'If-Match': `"${written?.etag}"` },
      body: lookup,
    });
    expect(await errorOf(put)).toEqual({ status: 403, error: 'owner' });
    expect(await errorOf(await send(path, { method: 'DELETE', token: OWNER }))).toEqual({
      status: 401,
      error: 'token',
    });
  });

  it('refuses a delete of an object that does not exist, or without an owner token', async () => {
    const { send } = setup();
    const { vaultId } = await created(send);
    const path = `/api/recovery/${newId()}`;
    expect(await errorOf(await send(path, { method: 'DELETE', token: OWNER }))).toEqual({
      status: 404,
      error: 'notFound',
    });
    await send(path, {
      method: 'PUT',
      token: OWNER,
      headers: { 'X-Vault-Id': vaultId, 'If-None-Match': '*' },
      body: lookup,
    });
    expect(await errorOf(await send(path, { method: 'DELETE' }))).toEqual({
      status: 401,
      error: 'token',
    });
    expect(await errorOf(await send(path, { method: 'DELETE', token: READER }))).toEqual({
      status: 403,
      error: 'owner',
    });
  });
});
