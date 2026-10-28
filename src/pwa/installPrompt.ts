import { useSyncExternalStore } from 'react';

/**
 * How the browser installs the app: `prompt` (Chromium, from `beforeinstallprompt`), `ios`
 * (the steps of the Share menu) or null (installed, or the browser cannot install it).
 */
export type InstallMode = 'prompt' | 'ios' | null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

const INSTALLED_DISPLAY_MODES = [
  'standalone',
  'fullscreen',
  'minimal-ui',
  'window-controls-overlay',
];

/** True in the installed app: an installed display mode, or the Home Screen app of iOS. */
export const isInstalled = (): boolean =>
  INSTALLED_DISPLAY_MODES.some(mode => window.matchMedia(`(display-mode: ${mode})`).matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** True on iOS and iPadOS. An iPad can show as a Mac, but a Mac has no touch points. */
export const isIos = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * The other browsers of iOS and the in-app browsers (Chrome, Firefox, Edge, Opera, the Google
 * app, Facebook, Instagram, LINE). The install guide gives the steps of Safari.
 */
const OTHER_IOS_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\//;

/** True in Safari on iOS and iPadOS, where Share > Add to Home Screen installs the app. */
export const isIosSafari = (): boolean => isIos() && !OTHER_IOS_BROWSERS.test(navigator.userAgent);

/** The kept `beforeinstallprompt` event. It can show the prompt one time. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

window.addEventListener('beforeinstallprompt', event => {
  // Keep the event for the Install button, and stop the mini-infobar of the browser
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installedNow = true;
  notify();
});

export const getInstallMode = (): InstallMode => {
  if (installedNow || isInstalled()) return null;
  if (deferredPrompt) return 'prompt';
  return isIosSafari() ? 'ios' : null;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useInstallMode = (): InstallMode => useSyncExternalStore(subscribe, getInstallMode);

/** Shows the install prompt of the browser. The event is then used, so the mode changes. */
export async function promptInstall(): Promise<void> {
  const event = deferredPrompt;
  if (!event) return;
  deferredPrompt = null;
  notify();
  await event.prompt().catch(() => undefined);
}
