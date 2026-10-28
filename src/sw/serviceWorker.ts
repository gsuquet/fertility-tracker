/**
 * Service worker caching logic. `entry.ts` runs it in the worker; the build injects the
 * cache name and the precache list (see scripts/pwa/serviceWorkerPlugin.ts).
 */

/** Every cache of this app starts with this prefix. Activate deletes the old ones. */
export const CACHE_PREFIX = 'fertility-tracker-';

export interface ServiceWorkerConfig {
  cacheName: string;
  /** URLs relative to the service worker: `./` (the app shell) and every build file. */
  precache: readonly string[];
}

export interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface MessageEventLike {
  data: unknown;
}

/** The message of the page that activates a waiting worker (the user chose Reload). */
export const SKIP_WAITING = 'SKIP_WAITING';

export interface FetchEventLike {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

/** The part of `ServiceWorkerGlobalScope` that the worker uses. */
export interface ServiceWorkerScopeLike {
  location: { href: string; origin: string };
  caches: CacheStorage;
  fetch(request: Request): Promise<Response>;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: ExtendableEventLike) => void
  ): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
}

/**
 * Precache requests have no Origin header, but module scripts are CORS requests. A server that
 * sends `Vary: Origin` would make every match miss, so the URL alone selects the response.
 */
const MATCH_OPTIONS: CacheQueryOptions = { ignoreVary: true };

async function precacheAll(scope: ServiceWorkerScopeLike, config: ServiceWorkerConfig) {
  const cache = await scope.caches.open(config.cacheName);
  await cache.addAll(config.precache.map(url => new URL(url, scope.location.href).href));
}

async function deleteOldCaches(scope: ServiceWorkerScopeLike, cacheName: string) {
  const names = await scope.caches.keys();
  await Promise.all(
    names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== cacheName)
      .map(name => scope.caches.delete(name))
  );
  await scope.clients.claim();
}

/**
 * After a deploy, the server answers an old hashed file name with index.html (SPA fallback).
 * Storing that HTML under the asset URL would break the asset until the next deploy.
 */
const isHtml = (response: Response) =>
  String(response.headers.get('Content-Type')).includes('text/html');

async function cacheFirst(scope: ServiceWorkerScopeLike, cacheName: string, request: Request) {
  const cache = await scope.caches.open(cacheName);
  const cached = await cache.match(request, MATCH_OPTIONS);
  if (cached) return cached;
  const response = await scope.fetch(request);
  if (response.ok && !isHtml(response)) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(
  scope: ServiceWorkerScopeLike,
  cacheName: string,
  request: Request,
  fallbackUrl?: string
) {
  const cache = await scope.caches.open(cacheName);
  try {
    const response = await scope.fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached =
      (await cache.match(request, MATCH_OPTIONS)) ??
      (fallbackUrl ? await cache.match(fallbackUrl, MATCH_OPTIONS) : undefined);
    return cached ?? Response.error();
  }
}

/**
 * The app shell comes from the cache of this worker, so the page always runs the version of the
 * active worker. A new version thus waits until the user chooses Reload.
 */
async function shellFirst(
  scope: ServiceWorkerScopeLike,
  cacheName: string,
  request: Request,
  shellUrl: string
) {
  const cache = await scope.caches.open(cacheName);
  return (
    (await cache.match(shellUrl, MATCH_OPTIONS)) ??
    networkFirst(scope, cacheName, request, shellUrl)
  );
}

/**
 * Returns the response for a request, or undefined to let the browser handle it.
 * Hashed files in `assets/` are cache-first. A navigation to the app (`./` or `./index.html`)
 * gets the cached app shell first. Other navigations and files are network-first, and an
 * offline navigation falls back to the cached app shell.
 */
export function handleFetch(
  scope: ServiceWorkerScopeLike,
  cacheName: string,
  request: Request
): Promise<Response> | undefined {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.location.origin) return undefined;
  if (request.mode === 'navigate') {
    const shell = new URL('./', scope.location.href);
    const isShell =
      url.pathname === shell.pathname || url.pathname === `${shell.pathname}index.html`;
    return isShell
      ? shellFirst(scope, cacheName, request, shell.href)
      : networkFirst(scope, cacheName, request, shell.href);
  }
  if (url.pathname.includes('/assets/')) return cacheFirst(scope, cacheName, request);
  return networkFirst(scope, cacheName, request);
}

export function installServiceWorker(scope: ServiceWorkerScopeLike, config: ServiceWorkerConfig) {
  scope.addEventListener('install', event => event.waitUntil(precacheAll(scope, config)));
  scope.addEventListener('activate', event =>
    event.waitUntil(deleteOldCaches(scope, config.cacheName))
  );
  // A new version waits until the user chooses Reload. The first install has no worker to wait
  // for, so it activates at once.
  scope.addEventListener('message', event => {
    if (event.data === SKIP_WAITING) void scope.skipWaiting();
  });
  scope.addEventListener('fetch', event => {
    const response = handleFetch(scope, config.cacheName, event.request);
    if (response) event.respondWith(response);
  });
}
