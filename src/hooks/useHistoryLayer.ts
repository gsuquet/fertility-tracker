import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ActiveTab } from '../types/crms';

/**
 * Back (the back button or gesture of the device, or of the browser) closes the top layer, then
 * goes to the previous page. Each open layer and each page change has one history entry. This is
 * the only module that calls `history`.
 */

const TABS: readonly ActiveTab[] = ['today', 'chart', 'calendar', 'analytics'];
const DEPTH_KEY = 'ftLayerDepth';

/** The page of a hash such as `#chart`. An unknown or empty hash gives Today. */
export const parseTabHash = (hash: string): ActiveTab =>
  TABS.find(tab => `#${tab}` === hash) ?? 'today';

/** The open layers, oldest first. */
let layers: { close: () => void }[] = [];
let activeTab: ActiveTab = 'today';
/** True while the root of the app is mounted. Without it, the hash does not follow a page. */
let mounted = false;
/** True between a `history.go()` of this module and its `popstate`. */
let traversing = false;
let scheduled = false;
const tabListeners = new Set<() => void>();

const depthOf = (state: unknown): number => {
  const depth = (state as Record<string, unknown> | null)?.[DEPTH_KEY];
  return typeof depth === 'number' ? depth : 0;
};

const setActiveTab = (tab: ActiveTab) => {
  if (tab === activeTab) return;
  activeTab = tab;
  for (const listener of tabListeners) listener();
};

/** Makes the history entries match the page and the open layers. */
const sync = () => {
  scheduled = false;
  if (traversing) return;
  const depth = depthOf(window.history.state);
  const samePage = !mounted || parseTabHash(window.location.hash) === activeTab;
  // An entry of a closed layer, or of the layers of another page: go back to an entry to keep
  const keep = samePage ? Math.min(depth, layers.length) : 0;
  if (keep < depth) {
    traversing = true;
    window.history.go(keep - depth);
    return;
  }
  if (!samePage) window.history.pushState({ [DEPTH_KEY]: 0 }, '', `#${activeTab}`);
  for (let next = depthOf(window.history.state) + 1; next <= layers.length; next++) {
    window.history.pushState({ [DEPTH_KEY]: next }, '');
  }
};

// After the changes of one React commit, so that StrictMode and a layer that replaces another
// do not add entries
const scheduleSync = () => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(sync);
};

window.addEventListener('popstate', event => {
  if (traversing) {
    traversing = false;
    scheduleSync();
    return;
  }
  setActiveTab(parseTabHash(window.location.hash));
  // Back closes each layer above the new entry, the top one first. A layer that stays open
  // (for example, it asks for a confirmation) gets its entry again.
  for (const layer of layers.slice(depthOf(event.state)).reverse()) layer.close();
  scheduleSync();
});

window.addEventListener('hashchange', () => {
  if (traversing) return;
  setActiveTab(parseTabHash(window.location.hash));
  scheduleSync();
});

/**
 * Adds a history entry while `open` is true. Back then calls `onClose`. When the layer closes in
 * another way, its entry goes away.
 */
export const useHistoryLayer = (onClose: () => void, open = true): void => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const layer = { close: () => onCloseRef.current() };
    layers = [...layers, layer];
    scheduleSync();
    return () => {
      layers = layers.filter(open => open !== layer);
      scheduleSync();
    };
  }, [open]);
};

/** Sets the first page. A layer entry of the last session does not count as an open layer. */
const start = (initialTab: ActiveTab) => {
  activeTab = initialTab;
  const hash = parseTabHash(window.location.hash) === initialTab ? undefined : `#${initialTab}`;
  window.history.replaceState({ [DEPTH_KEY]: 0 }, '', hash);
};

const subscribe = (listener: () => void) => {
  tabListeners.add(listener);
  return () => tabListeners.delete(listener);
};

const getActiveTab = () => activeTab;

/** Changes the page and adds its history entry. */
const changeTab = (tab: ActiveTab) => {
  setActiveTab(tab);
  scheduleSync();
};

/**
 * The open page, kept in the hash of the address. Use it one time, in the root of the app.
 * `initialTab` is the first page, for example from a launch shortcut.
 */
export const useHistoryTab = (initialTab: ActiveTab): [ActiveTab, (tab: ActiveTab) => void] => {
  useState(() => start(initialTab));
  useEffect(() => {
    mounted = true;
    return () => {
      mounted = false;
      traversing = false;
    };
  }, []);
  return [useSyncExternalStore(subscribe, getActiveTab), changeTab];
};
