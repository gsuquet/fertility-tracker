import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeObservation } from '../../test/factories';
import { getTodayStr } from '../../utils/dateUtils';
import { STORAGE_BADGE_ON_KEY } from '../../utils/storageKeys';
import {
  disableBadge,
  enableBadge,
  isBadgeSupported,
  msUntilMidnight,
  showsBadge,
  updateAppBadge,
  useAppBadge,
  useBadgeEnabled,
} from '../appBadge';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';

/** A fake Badging API. */
const installBadgeApi = (refuse = false) => {
  const result = () => (refuse ? Promise.reject(new Error('refused')) : Promise.resolve());
  const setAppBadge = vi.fn(result);
  const clearAppBadge = vi.fn(result);
  Object.defineProperty(navigator, 'setAppBadge', { value: setAppBadge, configurable: true });
  Object.defineProperty(navigator, 'clearAppBadge', { value: clearAppBadge, configurable: true });
  return { setAppBadge, clearAppBadge };
};

/** The installed app: the standalone display mode matches. */
const setInstalled = (installed: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation(
    query =>
      ({
        matches: installed && query === '(display-mode: standalone)',
        media: query,
      }) as MediaQueryList
  );
};

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

let originalMatchMedia: ((query: string) => MediaQueryList) | undefined;

beforeEach(() => {
  originalMatchMedia = vi.mocked(window.matchMedia).getMockImplementation();
});

afterEach(() => {
  vi.mocked(window.matchMedia).mockImplementation(originalMatchMedia as typeof window.matchMedia);
  Reflect.deleteProperty(navigator, 'setAppBadge');
  Reflect.deleteProperty(navigator, 'clearAppBadge');
  Reflect.deleteProperty(document, 'visibilityState');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  disableBadge();
});

describe('isBadgeSupported', () => {
  it('needs both functions of the Badging API', () => {
    expect(isBadgeSupported()).toBe(false);
    installBadgeApi();
    expect(isBadgeSupported()).toBe(true);
    Reflect.deleteProperty(navigator, 'clearAppBadge');
    expect(isBadgeSupported()).toBe(false);
  });
});

describe('showsBadge', () => {
  it('shows the dot only while today has no observation', () => {
    const today = '2026-10-28';
    expect(showsBadge([], today)).toBe(true);
    expect(showsBadge([makeObservation({ date: '2026-10-27' })], today)).toBe(true);
    expect(showsBadge([makeObservation({ date: today })], today)).toBe(false);
  });
});

describe('msUntilMidnight', () => {
  it('counts the time to the next local midnight', () => {
    expect(msUntilMidnight(new Date(2026, 9, 28, 23, 59, 0))).toBe(60_000);
    expect(msUntilMidnight(new Date(2026, 9, 28, 0, 0, 0))).toBe(24 * 3600_000);
  });
});

describe('updateAppBadge', () => {
  it('does nothing without the API or outside the installed app', () => {
    setInstalled(true);
    expect(() => updateAppBadge(true)).not.toThrow();
    const { setAppBadge } = installBadgeApi();
    setInstalled(false);
    updateAppBadge(true);
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it('sets a dot with no number, clears it, and ignores a refused call', async () => {
    setInstalled(true);
    const { setAppBadge, clearAppBadge } = installBadgeApi();
    updateAppBadge(true);
    expect(setAppBadge).toHaveBeenCalledWith();
    updateAppBadge(false);
    expect(clearAppBadge).toHaveBeenCalledOnce();
    installBadgeApi(true);
    updateAppBadge(true);
    // The refused promise has a handler, so it is not an unhandled rejection
    await Promise.resolve();
  });
});

describe('enableBadge and disableBadge', () => {
  it('is off by default, saves the choice and follows a change', async () => {
    const { result } = renderHook(() => useBadgeEnabled());
    expect(result.current).toBe(false);
    await act(async () => {
      expect(await enableBadge()).toBe('on');
    });
    expect(result.current).toBe(true);
    expect(localStorage.getItem(STORAGE_BADGE_ON_KEY)).toBe('true');
    act(() => disableBadge());
    expect(result.current).toBe(false);
  });

  it('keeps the choice in memory when the browser cannot save it', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useBadgeEnabled());
    await act(async () => {
      await enableBadge();
    });
    expect(result.current).toBe(true);
    expect(localStorage.getItem(STORAGE_BADGE_ON_KEY)).toBeNull();
  });

  it('asks for the permission for notifications on iOS, and stays off when refused', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    const requestPermission = vi.fn(async () => 'denied' as NotificationPermission);
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    expect(await enableBadge()).toBe('denied');
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_BADGE_ON_KEY)).toBeNull();

    requestPermission.mockResolvedValue('granted');
    expect(await enableBadge()).toBe('on');
  });

  it('does not ask again on iOS when the permission is there, or when iOS has no Notification', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    const requestPermission = vi.fn();
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission });
    expect(await enableBadge()).toBe('on');
    vi.stubGlobal('Notification', undefined);
    expect(await enableBadge()).toBe('on');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not ask for a permission outside iOS', async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    expect(await enableBadge()).toBe('on');
    expect(requestPermission).not.toHaveBeenCalled();
  });
});

describe('useAppBadge', () => {
  it('only removes the dot while the badge is off', () => {
    setInstalled(true);
    const { setAppBadge, clearAppBadge } = installBadgeApi();
    renderHook(() => useAppBadge([]));
    expect(clearAppBadge).toHaveBeenCalledOnce();
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it('follows the observations of today, midnight and the return to the app', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date(2026, 9, 28, 23, 59, 0));
    setInstalled(true);
    const { setAppBadge, clearAppBadge } = installBadgeApi();
    await enableBadge();
    const today = makeObservation({ date: getTodayStr() });
    const { rerender, unmount } = renderHook(({ list }) => useAppBadge(list), {
      initialProps: { list: [today] },
    });
    expect(clearAppBadge).toHaveBeenCalledOnce();

    // After a delete of the observation of today, the dot shows
    rerender({ list: [] });
    expect(setAppBadge).toHaveBeenCalledOnce();

    // At midnight, the observation is of yesterday, so the dot shows
    rerender({ list: [today] });
    expect(clearAppBadge).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(61_000));
    expect(setAppBadge).toHaveBeenCalledTimes(2);
    // The next update is at the next midnight
    act(() => vi.advanceTimersByTime(24 * 3600_000));
    expect(setAppBadge).toHaveBeenCalledTimes(3);

    // The app shows again: the badge updates. A hidden app does not update it.
    setVisibility('hidden');
    expect(setAppBadge).toHaveBeenCalledTimes(3);
    setVisibility('visible');
    expect(setAppBadge).toHaveBeenCalledTimes(4);

    unmount();
    setVisibility('visible');
    act(() => vi.advanceTimersByTime(48 * 3600_000));
    expect(setAppBadge).toHaveBeenCalledTimes(4);
  });
});
