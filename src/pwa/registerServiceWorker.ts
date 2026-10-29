import { useSyncExternalStore } from 'react';

/**
 * The message that activates a waiting worker: `SKIP_WAITING` of src/sw/serviceWorker.ts. The page
 * does not import the worker code. Else the build puts that code in a shared chunk, and sw.js, a
 * classic worker script, cannot import it.
 */
export const SKIP_WAITING_MESSAGE = 'SKIP_WAITING';

/** The page asks the browser to check for a new version at most once in this time. */
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** The worker of the new version that the user can apply, or null. */
let newWorker: ServiceWorker | null = null;
/** True after Reload, so that the page reloads when the new worker takes control. */
let applying = false;
let reloaded = false;
const listeners = new Set<() => void>();

const setNewWorker = (worker: ServiceWorker | null) => {
  newWorker = worker;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const isUpdateReady = () => newWorker !== null;

/** True when a new version is installed and waits for **Reload**. */
export const useUpdateReady = (): boolean => useSyncExternalStore(subscribe, isUpdateReady);

/** Keeps the new worker until a newer one replaces it (state `redundant`). */
const offerWorker = (worker: ServiceWorker) => {
  setNewWorker(worker);
  worker.addEventListener('statechange', () => {
    if (worker.state === 'redundant' && newWorker === worker) setNewWorker(null);
  });
};

/**
 * A worker that waits while the page has a controller is a new version. Without a controller,
 * this is the first install: the worker activates at once, so it is not an update.
 */
const watchForUpdate = (registration: ServiceWorkerRegistration) => {
  const hasController = () => navigator.serviceWorker.controller !== null;
  if (registration.waiting && hasController()) offerWorker(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && hasController()) offerWorker(worker);
    });
  });
  // The browser checks for a new sw.js only when it loads the page. An installed app often comes
  // back from the background without a load, so the page asks for the check, at most once a day.
  // The load just checked, so the first check is a day later. Offline, the check fails.
  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS)
      return;
    lastCheck = Date.now();
    registration.update().catch(() => undefined);
  });
  // Only the Reload of this window reloads it. When another window applies the update, this
  // window keeps its work and its message: its Reload then only reloads.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!applying || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
};

/** Activates the new worker, then reloads the page one time when it takes control. */
export function applyUpdate(): void {
  if (!newWorker) return;
  applying = true;
  if (newWorker.state === 'installed') {
    newWorker.postMessage(SKIP_WAITING_MESSAGE);
  } else {
    // Another window activated it already, so no controllerchange comes for this message
    reloaded = true;
    window.location.reload();
  }
}

/**
 * Registers the service worker that the build writes to dist/sw.js. It runs from the app bundle,
 * so index.html needs no inline script and the CSP needs no 'unsafe-inline' for scripts.
 * The app works without the service worker, so a failed registration is ignored.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  if (registration) watchForUpdate(registration);
}
