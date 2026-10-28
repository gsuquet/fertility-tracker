import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setNavigator = (key: string, value: unknown) =>
  Object.defineProperty(navigator, key, { value, configurable: true });

const setDisplayMode = (installedMode: string | null) =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    query =>
      ({
        matches: installedMode !== null && query === `(display-mode: ${installedMode})`,
      }) as never
  );

/** A fresh module for each test: the kept event is module state. */
const load = async () => {
  vi.resetModules();
  return import('../installPrompt');
};

/** Sends `beforeinstallprompt` as Chromium does, and returns the event. */
const offerInstall = (prompt = vi.fn(async () => ({ outcome: 'accepted' }))) => {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
};

describe('install mode', () => {
  beforeEach(() => setDisplayMode(null));

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ['userAgent', 'platform', 'maxTouchPoints', 'standalone']) {
      Reflect.deleteProperty(navigator, key);
    }
  });

  it('is null in a browser that cannot install the app', async () => {
    const { getInstallMode } = await load();
    expect(getInstallMode()).toBeNull();
  });

  it('is ios on an iPhone, and on an iPad that shows as a Mac', async () => {
    const { getInstallMode } = await load();
    setNavigator('userAgent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    expect(getInstallMode()).toBe('ios');
    setNavigator('userAgent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    setNavigator('platform', 'MacIntel');
    setNavigator('maxTouchPoints', 5);
    expect(getInstallMode()).toBe('ios');
    setNavigator('maxTouchPoints', 0);
    expect(getInstallMode()).toBeNull();
  });

  it('is null in the installed app, also on iOS', async () => {
    const { getInstallMode, isInstalled } = await load();
    setNavigator('userAgent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    setNavigator('standalone', true);
    expect(isInstalled()).toBe(true);
    expect(getInstallMode()).toBeNull();
    setNavigator('standalone', false);
    for (const mode of ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']) {
      setDisplayMode(mode);
      expect(isInstalled()).toBe(true);
    }
  });

  it('keeps the install event of Chromium and stops its mini-infobar', async () => {
    const { useInstallMode } = await load();
    const { result } = renderHook(() => useInstallMode());
    expect(result.current).toBeNull();
    const event = offerInstall();
    expect(event.defaultPrevented).toBe(true);
    expect(result.current).toBe('prompt');
  });

  it('shows the prompt of the browser one time', async () => {
    const { promptInstall, useInstallMode } = await load();
    const prompt = vi.fn(async () => ({ outcome: 'dismissed' }));
    offerInstall(prompt);
    const { result } = renderHook(() => useInstallMode());
    await act(promptInstall);
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current).toBeNull();
    await act(promptInstall);
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('ignores a prompt that fails', async () => {
    const { promptInstall } = await load();
    offerInstall(vi.fn(async () => Promise.reject(new Error('already shown'))));
    await expect(promptInstall()).resolves.toBeUndefined();
  });

  it('hides the install offer after the app is installed, also on iOS', async () => {
    const { useInstallMode } = await load();
    setNavigator('userAgent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    offerInstall();
    const { result } = renderHook(() => useInstallMode());
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current).toBeNull();
  });
});
