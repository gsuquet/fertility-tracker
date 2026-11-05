import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createVault } from '../../sync/deviceVault';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import { controlOf } from '../../test/syncControl';
import { useHasSyncRecord } from '../useHasSyncRecord';

describe('useHasSyncRecord', () => {
  it('is false without a control', () => {
    expect(renderHook(() => useHasSyncRecord(undefined)).result.current).toBe(false);
  });

  it('is null while the key store loads, then tells if it has a record', async () => {
    const { relay } = createRelayHarness();
    const empty = renderHook(() => useHasSyncRecord(controlOf(relay, createMemoryKeyStore())));
    expect(empty.result.current).toBeNull();
    await waitFor(() => expect(empty.result.current).toBe(false));
    const keyStore = createMemoryKeyStore();
    await createVault(relay, keyStore, 'Phone');
    const control = controlOf(relay, keyStore);
    const synced = renderHook(() => useHasSyncRecord(control));
    await waitFor(() => expect(synced.result.current).toBe(true));
  });

  it('is false in a browser that blocks the storage of the record', async () => {
    const { relay } = createRelayHarness();
    const blocked = controlOf(relay, {
      ...createMemoryKeyStore(),
      load: () => Promise.reject(Object.assign(new Error('blocked'), { name: 'StorageBlocked' })),
    });
    const { result } = renderHook(() => useHasSyncRecord(blocked));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('stays null after a failed load, and ignores a load that ends after the unmount', async () => {
    const { relay } = createRelayHarness();
    const failing = controlOf(relay, createMemoryKeyStore(), {
      services: () => Promise.reject(new Error('blocked')),
    });
    const failed = renderHook(() => useHasSyncRecord(failing));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(failed.result.current).toBeNull();
    let release: () => void = () => {};
    const keyStore = createMemoryKeyStore();
    const slow = controlOf(relay, {
      ...keyStore,
      load: () =>
        new Promise(resolve => {
          release = () => resolve(null);
        }),
    });
    const late = renderHook(() => useHasSyncRecord(slow));
    await waitFor(() => expect(release).not.toBe(undefined));
    late.unmount();
    release();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(late.result.current).toBeNull();
  });
});
