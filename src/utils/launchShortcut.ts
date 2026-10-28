/**
 * The shortcuts of the app icon (manifest `shortcuts`). Each one opens `./?shortcut=<name>`.
 * A backup file that the user opens with the app (manifest `file_handlers`) opens
 * `./?restore=file`, and the file comes through `window.launchQueue`.
 */
export type LaunchShortcut = 'log' | 'chart';

const PARAM = 'shortcut';
/** The parameter of the `action` of the file handler. */
const RESTORE_PARAM = 'restore';
const SHORTCUTS: readonly LaunchShortcut[] = ['log', 'chart'];

const parseLaunchShortcut = (url: string): LaunchShortcut | null => {
  const value = new URL(url).searchParams.get(PARAM);
  return SHORTCUTS.find(shortcut => shortcut === value) ?? null;
};

/** Returns the shortcut of the address, or null. It does not change the address. */
export function readLaunchShortcut(): LaunchShortcut | null {
  return parseLaunchShortcut(window.location.href);
}

interface LaunchParams {
  targetURL?: string;
  files?: readonly { getFile(): Promise<File> }[];
}

interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void;
}

/** Reads the text of a file. A file that the app cannot read gives an empty text. */
const readText = async (handle: { getFile(): Promise<File> }) => {
  try {
    return await (await handle.getFile()).text();
  } catch {
    return '';
  }
};

/**
 * Calls `onShortcut` when a shortcut opens the window that is already open. The manifest asks for
 * `focus-existing`, so the browser does not reload the window and a draft in the drawer stays.
 * Calls `onBackupFile` with the text of a backup file that the user opens with the app, also at
 * the start. An empty text is a file that the app cannot read.
 * A page has only one consumer of the launch queue, so this one function sets it for both.
 * Only Chromium has `window.launchQueue`. Elsewhere, this does nothing.
 */
export function listenForLaunches(
  onShortcut: (shortcut: LaunchShortcut) => void,
  onBackupFile: (text: string) => void
): void {
  const queue = (window as Window & { launchQueue?: LaunchQueue }).launchQueue;
  queue?.setConsumer(({ targetURL, files }) => {
    // The manifest accepts one file: the app restores only the first one
    const [file] = files ?? [];
    if (file) {
      void readText(file).then(onBackupFile);
      return;
    }
    const shortcut = targetURL ? parseLaunchShortcut(targetURL) : null;
    if (shortcut) onShortcut(shortcut);
  });
}

/** Removes the shortcut and the restore parameter from the address, so a reload does not run them. */
export function clearLaunchShortcut(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM) && !url.searchParams.has(RESTORE_PARAM)) return;
  url.searchParams.delete(PARAM);
  url.searchParams.delete(RESTORE_PARAM);
  window.history.replaceState(window.history.state, '', url);
}
