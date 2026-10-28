import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ShortcutId } from '../domain/keyboardShortcuts';
import {
  SHORTCUT_KEYS,
  SHORTCUT_LABELS,
  isShortcutBlocked,
  shortcutFor,
} from '../domain/keyboardShortcuts';
import { readStorage, writeStorage } from '../utils/storage';
import { STORAGE_SHORTCUTS_OFF_KEY } from '../utils/storageKeys';

// The on/off choice. It is in memory too, for a browser that cannot save it.
let memoryOff: boolean | null = null;
const enabledListeners = new Set<() => void>();

const getEnabled = () => !(memoryOff ?? readStorage(STORAGE_SHORTCUTS_OFF_KEY) === 'true');

const subscribeEnabled = (listener: () => void) => {
  enabledListeners.add(listener);
  return () => enabledListeners.delete(listener);
};

/** Turns all the keyboard shortcuts on or off, and saves the choice (WCAG 2.1.4). */
export const setShortcutsEnabled = (enabled: boolean): void => {
  memoryOff = writeStorage(STORAGE_SHORTCUTS_OFF_KEY, String(!enabled)) ? null : !enabled;
  for (const listener of enabledListeners) listener();
};

/** True while the keyboard shortcuts are on. They are on by default. */
export const useShortcutsEnabled = (): boolean =>
  useSyncExternalStore(subscribeEnabled, getEnabled);

// The handlers of each shortcut, oldest first. One document listener calls the newest one.
const handlers = new Map<ShortcutId, (() => void)[]>();

const onKeyDown = (e: KeyboardEvent) => {
  if (e.defaultPrevented || !getEnabled()) return;
  const id = shortcutFor(e);
  const handler = id && handlers.get(id)?.at(-1);
  if (!id || !handler || isShortcutBlocked(id, e.target)) return;
  e.preventDefault();
  handler();
};

/**
 * Calls `handler` when the user presses the key of the shortcut `id`, while the component is
 * mounted. When two components use the same shortcut, the last one mounted handles it.
 */
export function useShortcut(id: ShortcutId, handler: () => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const call = () => handlerRef.current();
    const stack = handlers.get(id) ?? [];
    handlers.set(id, [...stack, call]);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      const rest = (handlers.get(id) as (() => void)[]).filter(other => other !== call);
      if (rest.length > 0) handlers.set(id, rest);
      else handlers.delete(id);
      if (handlers.size === 0) document.removeEventListener('keydown', onKeyDown);
    };
  }, [id]);
}

/**
 * The tooltip and `aria-keyshortcuts` of a button with a shortcut. While the shortcuts are off,
 * the tooltip is the label only.
 */
export function useShortcutHint(): (
  label: string,
  id: ShortcutId
) => { title: string; 'aria-keyshortcuts'?: string } {
  const enabled = useShortcutsEnabled();
  return (label, id) =>
    enabled
      ? { title: `${label} (${SHORTCUT_LABELS[id]})`, 'aria-keyshortcuts': SHORTCUT_KEYS[id] }
      : { title: label };
}
