import { describe, expect, it, vi } from 'vitest';
import worker from '../worker';

describe('Worker of the application', () => {
  it('gives a request to /api/ to the relay, and another request to the static assets', async () => {
    const page = new Response('<html></html>');
    const env = { ASSETS: { fetch: vi.fn(async () => page) } };
    const relay = await worker.fetch(
      new Request('https://fertility-tracker.gsuquet.com/api/vaults/x'),
      env
    );
    expect(relay.status).toBe(503);
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    const asset = new Request('https://fertility-tracker.gsuquet.com/index.html');
    expect(await worker.fetch(asset, env)).toBe(page);
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(asset);
  });
});
