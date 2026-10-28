/**
 * The shortcuts of the app icon (manifest `shortcuts`). Each one opens `./?shortcut=<name>`.
 */
export type LaunchShortcut = 'log' | 'chart';

const PARAM = 'shortcut';
const SHORTCUTS: readonly LaunchShortcut[] = ['log', 'chart'];

const parseLaunchShortcut = (url: string): LaunchShortcut | null => {
  const value = new URL(url).searchParams.get(PARAM);
  return SHORTCUTS.find(shortcut => shortcut === value) ?? null;
};

/** Returns the shortcut of the address, or null. It does not change the address. */
export function readLaunchShortcut(): LaunchShortcut | null {
  return parseLaunchShortcut(window.location.href);
}

interface LaunchQueue {
  setConsumer(consumer: (params: { targetURL?: string }) => void): void;
}

/**
 * Calls `onShortcut` when a shortcut opens the window that is already open. The manifest asks for
 * `focus-existing`, so the browser does not reload the window and a draft in the drawer stays.
 * Only Chromium has `window.launchQueue`. Elsewhere, this does nothing.
 */
export function listenForLaunchShortcuts(onShortcut: (shortcut: LaunchShortcut) => void): void {
  const queue = (window as Window & { launchQueue?: LaunchQueue }).launchQueue;
  queue?.setConsumer(({ targetURL }) => {
    const shortcut = targetURL ? parseLaunchShortcut(targetURL) : null;
    if (shortcut) onShortcut(shortcut);
  });
}

/** Removes the shortcut from the address, so that a reload does not run it again. */
export function clearLaunchShortcut(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, '', url);
}
