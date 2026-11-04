import type React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CycleProvider, useCycleData } from '../../context/CycleContext';
import { LanguageProvider } from '../../context/LanguageContext';
import { createVault } from '../../sync/deviceVault';
import * as runner from '../../sync/syncRunner';
import { SYNC_ENABLED } from '../../sync/syncFlag';
import { makeObservation } from '../../test/factories';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import { CHANGE_SYNC_DELAY_MS, VISIBLE_SYNC_INTERVAL_MS, useSync } from '../useSync';
import type { SyncServices } from '../useSync';

const STORAGE_KEY = 'fertility_care_observations';
const STATE_KEY = 'fertility_care_sync_state';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <CycleProvider>{children}</CycleProvider>
  </LanguageProvider>
);

const setup = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  await createVault(harness.relay, keyStore);
  const runs = { count: 0 };
  const services: SyncServices = {
    relay: harness.relay,
    keyStore,
    runner: {
      ...runner,
      runSync: async input => {
        runs.count += 1;
        return runner.runSync(input);
      },
    },
  };
  const load = vi.fn(async () => services);
  return { ...harness, keyStore, services, runs, load };
};

const render = (load: () => Promise<SyncServices>) =>
  renderHook(
    () => {
      useSync(true, load);
      return useCycleData();
    },
    { wrapper }
  );

const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useSync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is off by default until the relay has its bucket, and then loads nothing', () => {
    expect(SYNC_ENABLED).toBe(false);
    const load = vi.fn();
    renderHook(() => useSync(undefined, load), { wrapper });
    renderHook(() => useSync(false, load), { wrapper });
    expect(load).not.toHaveBeenCalled();
  });

  it('loads the sync code, the relay client and the key store of the browser', async () => {
    const { result } = renderHook(
      () => {
        useSync(true);
        return useCycleData();
      },
      { wrapper }
    );
    // The test browser has no IndexedDB: the key store fails, and the sync does not occur
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.lastSyncDate).toBeNull();
  });

  it('syncs at the start, then saves the state and the date of the sync', async () => {
    const { load, runs } = await setup();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makeObservation({ date: '2026-10-01', bleeding: 'H' })])
    );
    const { result } = render(load);
    await waitFor(() => expect(result.current.lastSyncDate).not.toBeNull());
    expect(runs.count).toBe(1);
    expect(localStorage.getItem(STATE_KEY)).not.toBeNull();
    // The change that the sync applied starts no sync
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS + 100);
    });
    expect(runs.count).toBe(1);
  });

  it('syncs 5 seconds after the last change, when the page is visible after 60 seconds, and when the browser is online', async () => {
    const { load, runs } = await setup();
    const { result } = render(load);
    await waitFor(() => expect(runs.count).toBe(1));
    await waitFor(() => expect(result.current.lastSyncDate).not.toBeNull());
    act(() => result.current.saveObservation({ date: '2026-10-01', bleeding: 'H' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS - 1000);
    });
    act(() => result.current.saveObservation({ date: '2026-10-02', bleeding: 'H' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS - 1000);
    });
    expect(runs.count).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await waitFor(() => expect(runs.count).toBe(2));
    // Visible: only after 60 seconds, and not for a hidden page
    act(() => setVisibility('visible'));
    expect(runs.count).toBe(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VISIBLE_SYNC_INTERVAL_MS);
    });
    act(() => setVisibility('hidden'));
    expect(runs.count).toBe(2);
    act(() => setVisibility('visible'));
    await waitFor(() => expect(runs.count).toBe(3));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(runs.count).toBe(4));
  });

  it('keeps the sync state when the browser refuses the observations of the sync', async () => {
    const { load, runs, services } = await setup();
    const setItem = localStorage.setItem.bind(localStorage);
    let full = false;
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (full && key === STORAGE_KEY) throw new Error('QuotaExceededError');
      setItem(key, value);
    });
    const runSync = services.runner.runSync;
    services.runner = {
      ...services.runner,
      runSync: async input => {
        full = true;
        return runSync(input);
      },
    };
    const { result } = render(load);
    await waitFor(() => expect(result.current.saveFailed).toBe(true));
    expect(runs.count).toBe(1);
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    expect(result.current.lastSyncDate).toBeNull();
  });

  it('keeps the wait of a change when a sync applies a change', async () => {
    const { load, runs, services } = await setup();
    const runSync = services.runner.runSync;
    services.runner = {
      ...services.runner,
      runSync: async input => {
        const result = await runSync(input);
        // The second sync brings a day of another device
        if (runs.count !== 2 || result.status !== 'synced') return result;
        const extra = { date: '2026-09-01', bleeding: 'H' as const };
        return { ...result, observations: [...result.observations, extra], changed: true };
      },
    };
    const { result, unmount } = render(load);
    await waitFor(() => expect(result.current.lastSyncDate).not.toBeNull());
    await settle();
    act(() => result.current.saveObservation({ date: '2026-10-01', bleeding: 'H' }));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(result.current.observations).toHaveLength(2));
    expect(runs.count).toBe(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS);
    });
    await waitFor(() => expect(runs.count).toBe(3));
    unmount();
  });

  it('runs one sync at a time, and syncs again after the running sync', async () => {
    const { load, runs, services } = await setup();
    let release = () => {};
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    const runSync = services.runner.runSync;
    services.runner = {
      ...services.runner,
      runSync: async input => {
        if (runs.count === 0) await blocked;
        return runSync(input);
      },
    };
    render(load);
    act(() => {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('online'));
    });
    release();
    await waitFor(() => expect(runs.count).toBe(2));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(runs.count).toBe(2);
  });

  it('tries again at the next event when the sync code does not load', async () => {
    const { services } = await setup();
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(services);
    render(load);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  it('removes the base at a damaged load, and asks before it deletes more than 7 days', async () => {
    const { load, services } = await setup();
    const drop = vi.spyOn(services.runner, 'dropBaseAtLoad');
    localStorage.setItem(STORAGE_KEY, '{corrupt');
    load.mockRejectedValueOnce(new Error('offline'));
    render(load);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(drop).toHaveBeenCalledTimes(1));
    await settle();
    // A second load of the code after an error does not remove the base again
    services.keyStore.load = vi
      .fn()
      .mockRejectedValueOnce(new Error('storage'))
      .mockImplementation(createMemoryKeyStore().load);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await settle();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    await settle();
    expect(drop).toHaveBeenCalledTimes(1);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const runSync = services.runner.runSync;
    let answer: boolean | undefined;
    services.runner = {
      ...services.runner,
      runSync: async input => {
        answer = await input.confirmDeletions(['a', 'b']);
        return runSync(input);
      },
    };
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(answer).toBe(false));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2'));
  });
});
