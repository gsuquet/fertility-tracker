import { useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from '../utils/storage';
import { STORAGE_ENTRY_MODE_KEY } from '../utils/storageKeys';

/**
 * Direct Code Only: the observation forms hide the group rows. Today and the observation sheet
 * share the choice, and the device keeps it in `fertility_care_entry_mode`.
 */
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The last choice of this session. It also works when the browser blocks the storage. */
let chosen: boolean | null = null;

const read = () => chosen ?? readStorage(STORAGE_ENTRY_MODE_KEY) === 'direct';

/** Turns Direct Code Only on or off for each form. */
export const setDirectCodeOnly = (on: boolean): void => {
  chosen = on;
  writeStorage(STORAGE_ENTRY_MODE_KEY, on ? 'direct' : 'detailed');
  for (const listener of listeners) listener();
};

/** True when the forms show only the code field, the switches and the notes. */
export const useDirectCodeOnly = (): boolean => useSyncExternalStore(subscribe, read);
