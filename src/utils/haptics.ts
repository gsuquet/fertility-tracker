import { useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from './storage';
import { STORAGE_HAPTICS_OFF_KEY } from './storageKeys';

/** The kind of a vibration: `light` for a tap, `success` for a save. */
export type HapticKind = 'light' | 'success';

/** The length of each vibration, in milliseconds. Keep them short: a tap, not an alert. */
export const HAPTIC_PATTERNS: Record<HapticKind, number> = { light: 10, success: 15 };

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the browser has the Vibration API. Safari on iOS does not have it. */
export const isHapticsSupported = (): boolean => typeof navigator.vibrate === 'function';

// The on/off choice. It is in memory too, for a browser that cannot save it.
let memoryOff: boolean | null = null;
const listeners = new Set<() => void>();

const getEnabled = () => !(memoryOff ?? readStorage(STORAGE_HAPTICS_OFF_KEY) === 'true');

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Turns the vibrations on or off. They are on by default. */
export const setHapticsEnabled = (on: boolean): void => {
  memoryOff = writeStorage(STORAGE_HAPTICS_OFF_KEY, String(!on)) ? null : !on;
  for (const listener of listeners) listener();
};

/** True while the user has the vibrations on. */
export const useHapticsEnabled = (): boolean => useSyncExternalStore(subscribe, getEnabled);

/**
 * Gives a short vibration. Does nothing without the Vibration API, when the user turned the
 * vibrations off, or when the user prefers reduced motion.
 */
export const haptic = (kind: HapticKind): void => {
  if (!isHapticsSupported() || !getEnabled()) return;
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
    // A vibration is only a signal: a refused call changes nothing
  }
};
