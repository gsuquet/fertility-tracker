import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { STORAGE_ENTRY_MODE_KEY } from '../../utils/storageKeys';

/** A new copy of the module, so that the choice of this session starts empty. */
const freshModule = async () => {
  vi.resetModules();
  return import('../useDirectCodeOnly');
};

describe('useDirectCodeOnly', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reads the choice that the device keeps', async () => {
    window.localStorage.setItem(STORAGE_ENTRY_MODE_KEY, 'direct');
    const { useDirectCodeOnly } = await freshModule();
    expect(renderHook(() => useDirectCodeOnly()).result.current).toBe(true);
  });

  it('is off with no choice or with the detailed choice', async () => {
    const { useDirectCodeOnly } = await freshModule();
    expect(renderHook(() => useDirectCodeOnly()).result.current).toBe(false);
    window.localStorage.setItem(STORAGE_ENTRY_MODE_KEY, 'detailed');
    const again = await freshModule();
    expect(renderHook(() => again.useDirectCodeOnly()).result.current).toBe(false);
  });

  it('writes the choice and updates each form that uses it', async () => {
    const { setDirectCodeOnly, useDirectCodeOnly } = await freshModule();
    const first = renderHook(() => useDirectCodeOnly());
    const second = renderHook(() => useDirectCodeOnly());
    act(() => setDirectCodeOnly(true));
    expect(window.localStorage.getItem(STORAGE_ENTRY_MODE_KEY)).toBe('direct');
    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
    act(() => setDirectCodeOnly(false));
    expect(window.localStorage.getItem(STORAGE_ENTRY_MODE_KEY)).toBe('detailed');
    expect(first.result.current).toBe(false);
  });

  it('keeps the choice of the session when the browser blocks the storage', async () => {
    const { setDirectCodeOnly, useDirectCodeOnly } = await freshModule();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      act(() => setDirectCodeOnly(true));
      expect(renderHook(() => useDirectCodeOnly()).result.current).toBe(true);
    } finally {
      setItem.mockRestore();
    }
  });
});
