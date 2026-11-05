import { describe, expect, it, vi } from 'vitest';
import { randomBytes, toBase64Url } from '../../domain/vault/bytes';
import { createRelayHarness } from '../../test/relayHarness';
import { RELAY_TIMEOUT_MS, createRelayClient } from '../relayClient';

const newId = () => toBase64Url(randomBytes(16));

describe('relay client', () => {
  it('gives the status and the error code of a refusal', async () => {
    const { relay } = createRelayHarness();
    expect(await relay.getVault(newId(), 'token')).toEqual({
      ok: false,
      status: 404,
      error: 'notFound',
    });
    expect(await relay.getRecovery('x')).toEqual({ ok: false, status: 400, error: 'invalid' });
    expect(await relay.deleteRecovery(newId(), 't')).toMatchObject({ status: 404 });
    expect(await relay.putInvite(newId(), 't', newId())).toMatchObject({ status: 401 });
    expect(await relay.getInvite(newId(), 't')).toMatchObject({ status: 404 });
    expect(await relay.postInvite(newId(), 'request', {})).toMatchObject({ status: 404 });
    expect(await relay.deleteInvite(newId(), 't')).toMatchObject({ status: 404 });
    expect(await relay.putRecovery(newId(), 't', newId(), '{}', null)).toMatchObject({
      status: 401,
    });
    expect(await relay.putVault(newId(), 't', 'x', null)).toMatchObject({ status: 400 });
  });

  it('sends the token, the condition and the body, and gives the ETag without quotes', async () => {
    const requests: Request[] = [];
    const client = createRelayClient(async request => {
      requests.push(request);
      return new Response('{"a":1}', { status: 200, headers: { ETag: 'W/"abc"' } });
    }, 'https://example.com');
    expect(await client.putVault('v', 'tok', 'body', 'e1')).toEqual({
      ok: true,
      status: 200,
      text: '{"a":1}',
      etag: 'abc',
    });
    await client.putRecovery('l', 'tok', 'v', 'text', null);
    await client.postInvite('i', 'reveal', { nonce: 'n' }, 'tok');
    await client.postInvite('i', 'request', { tokenHash: 'h' });
    const [vault, recovery, reveal, request] = requests as [Request, Request, Request, Request];
    expect(vault.url).toBe('https://example.com/api/vaults/v');
    expect(vault.method).toBe('PUT');
    expect(vault.headers.get('Authorization')).toBe('Bearer tok');
    expect(vault.headers.get('If-Match')).toBe('"e1"');
    expect(vault.cache).toBe('no-store');
    expect(await vault.text()).toBe('body');
    expect(recovery.headers.get('If-None-Match')).toBe('*');
    expect(recovery.headers.get('X-Vault-Id')).toBe('v');
    expect(reveal.url).toBe('https://example.com/api/invites/i/reveal');
    expect(await reveal.json()).toEqual({ nonce: 'n' });
    expect(request.headers.has('Authorization')).toBe(false);
  });

  it('gives a null ETag, and the error unknown for an answer that is not a relay error', async () => {
    const answers = [
      new Response(null, { status: 204 }),
      new Response('not json', { status: 500 }),
      new Response('{"other":1}', { status: 502 }),
    ];
    const client = createRelayClient(async () => answers.shift() as Response, 'https://e.com');
    expect(await client.deleteInvite('i', 't')).toEqual({
      ok: true,
      status: 204,
      text: '',
      etag: null,
    });
    expect(await client.getVault('v', 't')).toEqual({ ok: false, status: 500, error: 'unknown' });
    expect(await client.getVault('v', 't')).toEqual({ ok: false, status: 502, error: 'unknown' });
  });

  it('stops a request after the relay timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    let signal: AbortSignal | null = null;
    const relay = createRelayClient(async request => {
      signal = request.signal;
      return new Response('{}', { status: 200 });
    }, 'https://relay.test');
    await relay.getRecovery('abc');
    expect(timeout).toHaveBeenCalledWith(RELAY_TIMEOUT_MS);
    expect(signal).not.toBeNull();
    timeout.mockRestore();
  });

  it('gives the error network when the fetch fails, and uses the origin of the page by default', async () => {
    const client = createRelayClient(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await client.getRecovery('l')).toEqual({ ok: false, status: 0, error: 'network' });
    const fetch = vi.fn(async (_request: Request) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    try {
      await createRelayClient().getRecovery('l');
    } finally {
      vi.unstubAllGlobals();
    }
    expect(fetch.mock.calls[0]?.[0].url).toBe(`${location.origin}/api/recovery/l`);
  });
});
