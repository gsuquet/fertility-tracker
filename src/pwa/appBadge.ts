import { useEffect, useSyncExternalStore } from 'react';
import { isUserObservation } from '../domain/backupReminder';
import type { Observation } from '../types/crms';
import { getTodayStr } from '../utils/dateUtils';
import { readStorage, writeStorage } from '../utils/storage';
import { STORAGE_BADGE_ON_KEY } from '../utils/storageKeys';
import { isInstalled, isIos } from './installPrompt';

/** True when the browser has the Badging API. */
export const isBadgeSupported = (): boolean =>
  typeof navigator.setAppBadge === 'function' && typeof navigator.clearAppBadge === 'function';

/** True when the icon must show the dot: today has no observation. Demo data does not count. */
export const showsBadge = (observations: readonly Observation[], today: string): boolean =>
  !observations.some(observation => observation.date === today && isUserObservation(observation));

/**
 * True when the badge needs the permission for notifications: in the web apps of WebKit, on iOS,
 * iPadOS and in the Dock of macOS. Chromium needs no permission.
 */
export const needsNotificationPermission = (): boolean =>
  isIos() ||
  (/AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent));

/**
 * Shows or removes the dot. Does nothing without the API or outside the installed app.
 * A refused call does nothing too: the badge is only a reminder.
 */
export const updateAppBadge = (show: boolean): void => {
  if (!isBadgeSupported() || !isInstalled()) return;
  const call = show ? navigator.setAppBadge() : navigator.clearAppBadge();
  call.catch(() => {});
};

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

/** Asks for the permission for notifications. A failed request is a refusal. */
const askPermission = async (): Promise<boolean> => {
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
};

/**
 * Turns the badge on. When the badge needs the permission for notifications, this asks for it
 * first. Gives `denied` and keeps the badge off when the user refuses.
 */
export const enableBadge = async (): Promise<'on' | 'denied'> => {
  const ask =
    needsNotificationPermission() &&
    typeof Notification !== 'undefined' &&
    Notification.permission !== 'granted';
  if (ask && !(await askPermission())) return 'denied';
  setEnabled(true);
  return 'on';
};

/** How often the app looks for a new date, in milliseconds. */
const DATE_CHECK_INTERVAL = 60_000;

/**
 * Keeps the dot on the app icon up to date while the badge is on: at the start, after each change
 * of the observations, when the date changes and when the app shows again. Removes the dot when
 * it is off.
 */
export function useAppBadge(observations: readonly Observation[]): void {
  const enabled = useBadgeEnabled();
  useEffect(() => {
    if (!enabled) {
      updateAppBadge(false);
      return;
    }
    let day = getTodayStr();
    const update = () => {
      day = getTodayStr();
      updateAppBadge(showsBadge(observations, day));
    };
    update();
    // A check each minute, not a timer to midnight: a timer of the browser stops while the
    // computer sleeps, and the time zone can change
    const timer = setInterval(() => {
      if (getTodayStr() !== day) update();
    }, DATE_CHECK_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, observations]);
}
