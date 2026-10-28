import { describe, expect, it, vi } from 'vitest';
import type {
  ExtendableEventLike,
  FetchEventLike,
  MessageEventLike,
  ServiceWorkerScopeLike,
} from '../serviceWorker';
import { CACHE_PREFIX, SKIP_WAITING, handleFetch, installServiceWorker } from '../serviceWorker';

const ORIGIN = 'https://app.example';
const SW_URL = `${ORIGIN}/sw.js`;
const CACHE = `${CACHE_PREFIX}1.16.0-abcd1234`;

/** In-memory CacheStorage keyed by absolute URL. */
class FakeCache {
  entries = new Map<string, Response>();
  constructor(private readonly network: (url: string) => Promise<Response>) {}
  /** The cache modes of the requests that `addAll` got. */
  modes: RequestCache[] = [];
  async addAll(requests: Request[]) {
    for (const request of requests) {
      this.modes.push(request.cache);
      this.entries.set(request.url, await this.network(request.url));
    }
  }
  async put(request: Request, response: Response) {
    this.entries.set(request.url, response);
  }
  /** Like a browser cache, a stored response with a Vary header misses unless ignoreVary is set. */
  async match(request: Request | string, options: CacheQueryOptions = {}) {
    const response = this.entries.get(typeof request === 'string' ? request : request.url);
    if (response?.headers.has('Vary') && !options.ignoreVary) return undefined;
    return response?.clone();
  }
}

class FakeCacheStorage {
  stores = new Map<string, FakeCache>();
  constructor(private readonly network: (url: string) => Promise<Response>) {}
  async open(name: string) {
    let cache = this.stores.get(name);
    if (!cache) {
      cache = new FakeCache(this.network);
      this.stores.set(name, cache);
    }
    return cache;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
}

type Listener = (event: ExtendableEventLike | FetchEventLike) => void;

const makeScope = (network: (url: string) => Promise<Response>) => {
  const listeners = new Map<string, Listener>();
  const caches = new FakeCacheStorage(network);
  const scope = {
    location: { href: SW_URL, origin: ORIGIN },
    caches: caches as unknown as CacheStorage,
    fetch: vi.fn((request: Request) => network(request.url)),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
  } as unknown as ServiceWorkerScopeLike;
  return { scope, caches, listeners };
};

const online = async (url: string) => new Response(`network:${url}`);
const offline = async (): Promise<Response> => {
  throw new TypeError('Failed to fetch');
};

const request = (path: string, init: { method?: string; navigate?: boolean } = {}) => {
  const req = new Request(new URL(path, ORIGIN), { method: init.method ?? 'GET' });
  if (init.navigate) Object.defineProperty(req, 'mode', { value: 'navigate' });
  return req;
};

const dispatch = async (listener: Listener | undefined, event: object = {}) => {
  let pending: Promise<unknown> = Promise.resolve();
  listener?.({
    ...event,
    waitUntil: (p: Promise<unknown>) => (pending = p),
  } as ExtendableEventLike);
  await pending;
};

describe('service worker', () => {
  it('precaches every build file on install and waits, so a new version does not take over', async () => {
    const { scope, caches, listeners } = makeScope(online);
    installServiceWorker(scope, { cacheName: CACHE, precache: ['./', 'assets/index-abc.js'] });
    await dispatch(listeners.get('install'));
    const cache = caches.stores.get(CACHE);
    expect([...(cache?.entries.keys() ?? [])]).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/assets/index-abc.js`,
    ]);
    expect(cache?.modes).toEqual(['reload', 'reload']);
    expect(scope.skipWaiting).not.toHaveBeenCalled();
  });

  it('activates a waiting worker only for the SKIP_WAITING message of the page', () => {
    const { scope, listeners } = makeScope(online);
    installServiceWorker(scope, { cacheName: CACHE, precache: [] });
    const message = listeners.get('message') as unknown as (event: MessageEventLike) => void;
    message({ data: 'OTHER' });
    message({ data: { type: SKIP_WAITING } });
    expect(scope.skipWaiting).not.toHaveBeenCalled();
    message({ data: SKIP_WAITING });
    expect(scope.skipWaiting).toHaveBeenCalledOnce();
  });

  it('deletes old app caches on activate and keeps other caches', async () => {
    const { scope, caches, listeners } = makeScope(online);
    await caches.open('fertility-tracker-v1');
    await caches.open(CACHE);
    await caches.open('other-app');
    installServiceWorker(scope, { cacheName: CACHE, precache: [] });
    await dispatch(listeners.get('activate'));
    expect(await caches.keys()).toEqual([CACHE, 'other-app']);
    expect(scope.clients.claim).toHaveBeenCalledOnce();
  });

  it('answers fetch events that it handles and leaves the others to the browser', async () => {
    const { scope, listeners } = makeScope(online);
    installServiceWorker(scope, { cacheName: CACHE, precache: [] });
    const respondWith = vi.fn();
    listeners.get('fetch')?.({ request: request('/manifest.webmanifest'), respondWith } as never);
    expect(respondWith).toHaveBeenCalledOnce();
    listeners.get('fetch')?.({ request: request('/', { method: 'POST' }), respondWith } as never);
    expect(respondWith).toHaveBeenCalledOnce();
  });

  it('ignores requests that are not GET or go to another origin', () => {
    const { scope } = makeScope(online);
    expect(handleFetch(scope, CACHE, request('/', { method: 'POST' }))).toBeUndefined();
    const font = new Request('https://example.com/font.woff2');
    expect(handleFetch(scope, CACHE, font)).toBeUndefined();
  });

  it('serves hashed assets from the cache without the network', async () => {
    const { scope, caches } = makeScope(online);
    const cache = await caches.open(CACHE);
    cache.entries.set(`${ORIGIN}/assets/a-1.js`, new Response('cached'));
    const response = await handleFetch(scope, CACHE, request('/assets/a-1.js'));
    expect(await response?.text()).toBe('cached');
    expect(scope.fetch).not.toHaveBeenCalled();
  });

  it('serves precached files from the cache even when the server sends Vary: Origin', async () => {
    const { scope, caches } = makeScope(offline);
    const cache = await caches.open(CACHE);
    const vary = { headers: { Vary: 'Origin' } };
    cache.entries.set(`${ORIGIN}/assets/a-1.js`, new Response('asset', vary));
    cache.entries.set(`${ORIGIN}/`, new Response('shell', vary));
    const asset = await handleFetch(scope, CACHE, request('/assets/a-1.js'));
    expect(await asset?.text()).toBe('asset');
    const page = await handleFetch(scope, CACHE, request('/', { navigate: true }));
    expect(await page?.text()).toBe('shell');
  });

  it('fetches and stores a hashed asset that is not cached yet', async () => {
    const { scope, caches } = makeScope(online);
    const response = await handleFetch(scope, CACHE, request('/assets/b-2.js'));
    expect(await response?.text()).toBe(`network:${ORIGIN}/assets/b-2.js`);
    expect(caches.stores.get(CACHE)?.entries.has(`${ORIGIN}/assets/b-2.js`)).toBe(true);
  });

  it('does not store the HTML fallback that the server returns for an old asset name', async () => {
    const html = { headers: { 'Content-Type': 'text/html; charset=utf-8' } };
    const { scope, caches } = makeScope(async () => new Response('<!doctype html>', html));
    const response = await handleFetch(scope, CACHE, request('/assets/old-9.js'));
    expect(response?.headers.get('Content-Type')).toContain('text/html');
    expect(caches.stores.get(CACHE)?.entries.has(`${ORIGIN}/assets/old-9.js`)).toBe(false);
  });

  it('does not store a failed response', async () => {
    const { scope, caches } = makeScope(async () => new Response('missing', { status: 404 }));
    const response = await handleFetch(scope, CACHE, request('/assets/c-3.js'));
    expect(response?.status).toBe(404);
    const page = await handleFetch(scope, CACHE, request('/missing', { navigate: true }));
    expect(page?.status).toBe(404);
    expect(caches.stores.get(CACHE)?.entries.size).toBe(0);
  });

  it('opens the app with the shell of its own cache, so a new version waits for Reload', async () => {
    const { scope, caches } = makeScope(online);
    const cache = await caches.open(CACHE);
    cache.entries.set(`${ORIGIN}/`, new Response('shell of this version'));
    for (const path of ['/', '/?shortcut=log', '/index.html']) {
      const response = await handleFetch(scope, CACHE, request(path, { navigate: true }));
      expect(await response?.text()).toBe('shell of this version');
    }
    expect(scope.fetch).not.toHaveBeenCalled();
  });

  it('loads the app shell from the network when it is not cached, and stores it', async () => {
    const { scope, caches } = makeScope(online);
    const response = await handleFetch(scope, CACHE, request('/', { navigate: true }));
    expect(await response?.text()).toBe(`network:${ORIGIN}/`);
    expect(caches.stores.get(CACHE)?.entries.has(`${ORIGIN}/`)).toBe(true);
  });

  it('loads the other navigations from the network first and stores them', async () => {
    const { scope, caches } = makeScope(online);
    const cache = await caches.open(CACHE);
    cache.entries.set(`${ORIGIN}/`, new Response('shell'));
    cache.entries.set(`${ORIGIN}/screenshots/phone.png`, new Response('old'));
    const response = await handleFetch(
      scope,
      CACHE,
      request('/screenshots/phone.png', { navigate: true })
    );
    expect(await response?.text()).toBe(`network:${ORIGIN}/screenshots/phone.png`);
  });

  it('serves the cached app shell for an offline navigation', async () => {
    const { scope, caches } = makeScope(offline);
    const cache = await caches.open(CACHE);
    cache.entries.set(`${ORIGIN}/`, new Response('shell'));
    const response = await handleFetch(scope, CACHE, request('/notes', { navigate: true }));
    expect(await response?.text()).toBe('shell');
  });

  it('serves a cached file when the network fails', async () => {
    const { scope, caches } = makeScope(offline);
    const cache = await caches.open(CACHE);
    cache.entries.set(`${ORIGIN}/manifest.webmanifest`, new Response('manifest'));
    const response = await handleFetch(scope, CACHE, request('/manifest.webmanifest'));
    expect(await response?.text()).toBe('manifest');
  });

  it('returns a network error when the network fails and nothing is cached', async () => {
    const { scope } = makeScope(offline);
    const file = await handleFetch(scope, CACHE, request('/robots.txt'));
    expect(file?.type).toBe('error');
    const page = await handleFetch(scope, CACHE, request('/', { navigate: true }));
    expect(page?.type).toBe('error');
  });
});
