import { afterEach, describe, expect, it, vi } from 'vitest';

const installServiceWorker = vi.fn();
vi.mock('../serviceWorker', () => ({ installServiceWorker }));

describe('service worker entry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('installs the handlers with the cache name and precache list injected at build time', async () => {
    vi.stubGlobal('__SW_CACHE_NAME__', 'fertility-tracker-1.16.0-abcd1234');
    vi.stubGlobal('__SW_PRECACHE__', ['./', 'assets/index-abc.js']);
    await import('../entry');
    expect(installServiceWorker).toHaveBeenCalledWith(globalThis, {
      cacheName: 'fertility-tracker-1.16.0-abcd1234',
      precache: ['./', 'assets/index-abc.js'],
    });
  });
});
