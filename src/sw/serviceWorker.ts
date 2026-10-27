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
}

/**
 * Precache requests have no Origin header, but module scripts are CORS requests. A server that
 * sends `Vary: Origin` would make every match miss, so the URL alone selects the response.
 */
const MATCH_OPTIONS: CacheQueryOptions = { ignoreVary: true };

async function precacheAll(scope: ServiceWorkerScopeLike, config: ServiceWorkerConfig) {
  const cache = await scope.caches.open(config.cacheName);
  await cache.addAll(config.precache.map(url => new URL(url, scope.location.href).href));
  await scope.skipWaiting();
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
 * Returns the response for a request, or undefined to let the browser handle it.
 * Hashed files in `assets/` are cache-first. Navigations and other files are network-first,
 * and an offline navigation falls back to the cached app shell (`./`).
 */
export function handleFetch(
  scope: ServiceWorkerScopeLike,
  cacheName: string,
  request: Request
): Promise<Response> | undefined {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.location.origin) return undefined;
  if (request.mode === 'navigate') {
    return networkFirst(scope, cacheName, request, new URL('./', scope.location.href).href);
  }
  if (url.pathname.includes('/assets/')) return cacheFirst(scope, cacheName, request);
  return networkFirst(scope, cacheName, request);
}

export function installServiceWorker(scope: ServiceWorkerScopeLike, config: ServiceWorkerConfig) {
  scope.addEventListener('install', event => event.waitUntil(precacheAll(scope, config)));
  scope.addEventListener('activate', event =>
    event.waitUntil(deleteOldCaches(scope, config.cacheName))
  );
  scope.addEventListener('fetch', event => {
    const response = handleFetch(scope, config.cacheName, event.request);
    if (response) event.respondWith(response);
  });
}
