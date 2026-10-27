/**
 * Registers the service worker that the build writes to dist/sw.js. It runs from the app bundle,
 * so index.html needs no inline script and the CSP needs no 'unsafe-inline' for scripts.
 * The app works without the service worker, so a failed registration is ignored.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  await navigator.serviceWorker.register('./sw.js').catch(() => undefined);
}
