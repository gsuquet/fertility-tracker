import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_HAPTICS_OFF_KEY } from '../storageKeys';
import {
  HAPTIC_PATTERNS,
  haptic,
  isHapticsSupported,
  setHapticsEnabled,
  useHapticsEnabled,
} from '../haptics';

/** A fake Vibration API. */
const installVibrate = (impl: () => boolean = () => true) => {
  const vibrate = vi.fn(impl);
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  return vibrate;
};

const setReducedMotion = (reduced: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation(
    query =>
      ({
        matches: reduced && query === '(prefers-reduced-motion: reduce)',
        media: query,
      }) as MediaQueryList
  );
};

let originalMatchMedia: ((query: string) => MediaQueryList) | undefined;

beforeEach(() => {
  originalMatchMedia = vi.mocked(window.matchMedia).getMockImplementation();
});

afterEach(() => {
  vi.mocked(window.matchMedia).mockImplementation(originalMatchMedia as typeof window.matchMedia);
  Reflect.deleteProperty(navigator, 'vibrate');
  vi.restoreAllMocks();
  setHapticsEnabled(true);
});

describe('haptics', () => {
  it('vibrates for 10 ms on a tap and for 15 ms on a save', () => {
    const vibrate = installVibrate();
    expect(isHapticsSupported()).toBe(true);
    haptic('light');
    haptic('success');
    expect(HAPTIC_PATTERNS).toEqual({ light: 10, success: 15 });
    expect(vibrate.mock.calls).toEqual([[10], [15]]);
  });

  it('does nothing without the Vibration API', () => {
    expect(isHapticsSupported()).toBe(false);
    expect(() => haptic('success')).not.toThrow();
  });

  it('does nothing when the user turned the vibrations off, and saves the choice', () => {
    const vibrate = installVibrate();
    setHapticsEnabled(false);
    expect(localStorage.getItem(STORAGE_HAPTICS_OFF_KEY)).toBe('true');
    haptic('light');
    expect(vibrate).not.toHaveBeenCalled();
    setHapticsEnabled(true);
    haptic('light');
    expect(vibrate).toHaveBeenCalledOnce();
  });

  it('does nothing when the user prefers reduced motion', () => {
    const vibrate = installVibrate();
    setReducedMotion(true);
    haptic('success');
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('ignores a vibration that the browser refuses', () => {
    installVibrate(() => {
      throw new Error('blocked');
    });
    expect(() => haptic('light')).not.toThrow();
  });

  it('keeps the choice in memory when the browser cannot save it', () => {
    const vibrate = installVibrate();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    setHapticsEnabled(false);
    haptic('light');
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('gives the current choice to the components', () => {
    const { result } = renderHook(() => useHapticsEnabled());
    expect(result.current).toBe(true);
    act(() => setHapticsEnabled(false));
    expect(result.current).toBe(false);
  });
});
