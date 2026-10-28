/**
 * The shortcuts of the app icon (manifest `shortcuts`). Each one opens `./?shortcut=<name>`.
 */
export type LaunchShortcut = 'log' | 'chart';

const PARAM = 'shortcut';
const SHORTCUTS: readonly LaunchShortcut[] = ['log', 'chart'];

/** Returns the shortcut of the address, or null. It does not change the address. */
export function readLaunchShortcut(): LaunchShortcut | null {
  const value = new URLSearchParams(window.location.search).get(PARAM);
  return SHORTCUTS.find(shortcut => shortcut === value) ?? null;
}

/** Removes the shortcut from the address, so that a reload does not run it again. */
export function clearLaunchShortcut(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, '', url);
}
