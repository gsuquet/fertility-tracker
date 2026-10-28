import { useSyncExternalStore } from 'react';

/**
 * The message that activates a waiting worker: `SKIP_WAITING` of src/sw/serviceWorker.ts. The page
 * does not import the worker code. Else the build puts that code in a shared chunk, and sw.js, a
 * classic worker script, cannot import it.
 */
export const SKIP_WAITING_MESSAGE = 'SKIP_WAITING';

/** The worker of a new version that waits for the user, or null. */
let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

const setWaitingWorker = (worker: ServiceWorker) => {
  waitingWorker = worker;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const isUpdateReady = () => waitingWorker !== null;

/** True when a new version is installed and waits for **Reload**. */
export const useUpdateReady = (): boolean => useSyncExternalStore(subscribe, isUpdateReady);

/**
 * A worker that waits while the page has a controller is a new version. Without a controller,
 * this is the first install: the worker activates at once, so it is not an update.
 */
const watchForUpdate = (registration: ServiceWorkerRegistration) => {
  const hasController = () => navigator.serviceWorker.controller !== null;
  if (registration.waiting && hasController()) setWaitingWorker(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && hasController()) setWaitingWorker(worker);
    });
  });
};

/** Activates the waiting worker, then reloads the page one time when it takes control. */
export function applyUpdate(): void {
  if (!waitingWorker) return;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  waitingWorker.postMessage(SKIP_WAITING_MESSAGE);
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
