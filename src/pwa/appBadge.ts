import { useEffect, useSyncExternalStore } from 'react';
import type { Observation } from '../types/crms';
import { getTodayStr } from '../utils/dateUtils';
import { readStorage, writeStorage } from '../utils/storage';
import { STORAGE_BADGE_ON_KEY } from '../utils/storageKeys';
import { isInstalled, isIos } from './installPrompt';

/** True when the browser has the Badging API. */
export const isBadgeSupported = (): boolean =>
  typeof navigator.setAppBadge === 'function' && typeof navigator.clearAppBadge === 'function';

/** True when the icon must show the dot: today has no observation. */
export const showsBadge = (observations: readonly Observation[], today: string): boolean =>
  !observations.some(observation => observation.date === today);

/**
 * Shows or removes the dot. Does nothing without the API or outside the installed app.
 * A refused call does nothing too: the badge is only a reminder.
 */
export const updateAppBadge = (show: boolean): void => {
  if (!isBadgeSupported() || !isInstalled()) return;
  const call = show ? navigator.setAppBadge() : navigator.clearAppBadge();
  call.catch(() => {});
};

/** The milliseconds from `now` to the next local midnight. */
export const msUntilMidnight = (now: Date): number =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

// The on/off choice. It is in memory too, for a browser that cannot save it.
let memoryOn: boolean | null = null;
const listeners = new Set<() => void>();

const getEnabled = () => memoryOn ?? readStorage(STORAGE_BADGE_ON_KEY) === 'true';

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setEnabled = (on: boolean) => {
  memoryOn = writeStorage(STORAGE_BADGE_ON_KEY, String(on)) ? null : on;
  for (const listener of listeners) listener();
};

/** True while the user has the badge on. It is off by default. */
export const useBadgeEnabled = (): boolean => useSyncExternalStore(subscribe, getEnabled);

/** Turns the badge off. */
export const disableBadge = (): void => setEnabled(false);

/**
 * Turns the badge on. On iOS and iPadOS, the badge needs the permission for notifications, so
 * this asks for it first. Gives `denied` and keeps the badge off when the user refuses.
 */
export const enableBadge = async (): Promise<'on' | 'denied'> => {
  if (isIos() && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  }
  setEnabled(true);
  return 'on';
};

/**
 * Keeps the dot on the app icon up to date while the badge is on: at the start, after each change
 * of the observations, at midnight and when the app shows again. Removes the dot when it is off.
 */
export function useAppBadge(observations: readonly Observation[]): void {
  const enabled = useBadgeEnabled();
  useEffect(() => {
    if (!enabled) {
      updateAppBadge(false);
      return;
    }
    const update = () => updateAppBadge(showsBadge(observations, getTodayStr()));
    update();
    let timer: ReturnType<typeof setTimeout>;
    // One second after midnight, so the date of today is the new date
    const schedule = () => {
      timer = setTimeout(() => {
        update();
        schedule();
      }, msUntilMidnight(new Date()) + 1000);
    };
    schedule();
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, observations]);
}
