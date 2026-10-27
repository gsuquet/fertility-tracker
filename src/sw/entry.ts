import type { ServiceWorkerScopeLike } from './serviceWorker';
import { installServiceWorker } from './serviceWorker';

// The build bundles this file to dist/sw.js and replaces the two constants.
installServiceWorker(globalThis as unknown as ServiceWorkerScopeLike, {
  cacheName: __SW_CACHE_NAME__,
  precache: __SW_PRECACHE__,
});
