import { describe, it, expect, afterEach, vi } from 'vitest';
import { readStorage, writeStorage, removeStorage, requestPersistentStorage } from '../storage';

describe('storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('writes, reads and removes a value', () => {
    expect(writeStorage('key', 'value')).toBe(true);
    expect(readStorage('key')).toBe('value');
    removeStorage('key');
    expect(readStorage('key')).toBeNull();
  });

  it('fails quietly when localStorage is not available', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readStorage('key')).toBeNull();
    expect(writeStorage('key', 'value')).toBe(false);
    expect(() => removeStorage('key')).not.toThrow();
  });

  it('asks the browser to keep the data and gives its answer', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persist } });
    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('gives false when the persistent storage API is missing', async () => {
    vi.stubGlobal('navigator', {});
    await expect(requestPersistentStorage()).resolves.toBe(false);
    vi.stubGlobal('navigator', { storage: {} });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('gives false when the browser refuses or fails', async () => {
    vi.stubGlobal('navigator', {
      storage: { persist: vi.fn().mockRejectedValue(new Error('no')) },
    });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});
