import type React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CycleProvider, useCycleData } from '../../context/CycleContext';
import { LanguageProvider } from '../../context/LanguageContext';
import { createVault, vaultStoreOf } from '../../sync/deviceVault';
import type { DeviceRecord } from '../../sync/keyStore';
import * as runner from '../../sync/syncRunner';
import { makeObservation } from '../../test/factories';
import { joinMember } from '../../test/joinMember';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import { removeMember } from '../../sync/membership';
import { markOf } from '../../utils/textMark';
import { serializeObservations } from '../../domain/storageFormat';
import { CHANGE_SYNC_DELAY_MS, VISIBLE_SYNC_INTERVAL_MS, useSync } from '../useSync';
import type { SyncServices } from '../useSync';

const STORAGE_KEY = 'fertility_care_observations';
const STATE_KEY = 'fertility_care_sync_state';
const SHARED_KEY = 'fertility_care_shared_chart';
const TIME_KEY = 'fertility_care_last_sync_at';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <CycleProvider>{children}</CycleProvider>
  </LanguageProvider>
);

const setup = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  await createVault(harness.relay, keyStore, 'Phone');
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
      useSync(load);
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

  it('loads the sync code, the relay client and the key store of the browser', async () => {
    const { result } = renderHook(
      () => {
        useSync();
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
    // The first sync runs. A sync that did not start yet covers a new call.
    await waitFor(() => expect(load).toHaveBeenCalled());
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

  it('gives the same control object at a render that changes no field', async () => {
    const { load } = await setup();
    const { result, rerender } = renderHook(() => useSync(load), { wrapper });
    await settle();
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('gives the services to Settings, loaded one time, and loads them again after a failure', async () => {
    const { services } = await setup();
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(services);
    const { result } = renderHook(() => useSync(load), { wrapper });
    await expect(result.current.services()).rejects.toThrow('offline');
    expect(await result.current.services()).toBe(services);
    expect(await result.current.services()).toBe(services);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('runs an action of Settings after the sync that runs, and syncs after a failed action', async () => {
    const { load, runs, services } = await setup();
    const { result } = renderHook(() => useSync(load), { wrapper });
    const order: string[] = [];
    const first = result.current.syncNow().then(() => order.push('sync'));
    const action = result.current.withSync(async loaded => {
      order.push(`action ${runs.count}`);
      expect(loaded).toBe(services);
      throw new Error('refused');
    });
    await expect(action).rejects.toThrow('refused');
    await first;
    await act(async () => {
      await result.current.syncNow();
    });
    expect(order).toEqual(['sync', 'action 1']);
    expect(runs.count).toBe(2);
  });

  it('gives the error of the last sync, and null after a sync without an error', async () => {
    const { load, failWhen } = await setup();
    failWhen(() => true);
    const { result } = renderHook(() => useSync(load), { wrapper });
    await waitFor(() => expect(result.current.lastError?.reason).toBe('relay'));
    expect(result.current.lastError?.detail?.status).toBe(0);
    failWhen(null);
    await act(async () => {
      await result.current.syncNow();
    });
    expect(result.current.lastError).toBeNull();
  });

  it('counts the failed syncs in a row, and saves the time of a full sync', async () => {
    const { load, failWhen } = await setup();
    localStorage.setItem(TIME_KEY, 'not a time');
    failWhen(() => true);
    const { result } = renderHook(() => useSync(load), { wrapper });
    expect(result.current.lastSyncedAt).toBeNull();
    expect(result.current.hasRecord).toBeNull();
    await waitFor(() => expect(result.current.failures).toBe(1));
    expect(result.current.hasRecord).toBe(true);
    await act(async () => {
      await result.current.syncNow();
    });
    expect(result.current.failures).toBe(2);
    expect(result.current.lastSyncedAt).toBeNull();
    failWhen(null);
    await act(async () => {
      await result.current.syncNow();
    });
    expect(result.current.failures).toBe(0);
    expect(result.current.lastSyncedAt).toBe(Number(localStorage.getItem(TIME_KEY)));
    expect(Date.now() - (result.current.lastSyncedAt as number)).toBeLessThan(5000);
    // Another tab removes the time
    localStorage.removeItem(TIME_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: TIME_KEY }));
    });
    expect(result.current.lastSyncedAt).toBeNull();
  });

  it('reads the record after an action, and forgets the failures without a record', async () => {
    const { load, failWhen, keyStore } = await setup();
    failWhen(() => true);
    const { result } = renderHook(() => useSync(load), { wrapper });
    await waitFor(() => expect(result.current.failures).toBe(1));
    // A key store that fails after the action keeps the known record
    const loadRecord = keyStore.load;
    await act(async () => {
      await result.current.withSync(async () => {
        keyStore.load = () => Promise.reject(new Error('blocked'));
      });
    });
    keyStore.load = loadRecord;
    expect(result.current.hasRecord).toBe(true);
    expect(result.current.failures).toBe(1);
    await act(async () => {
      await result.current.withSync(({ keyStore: store }) => store.clear());
    });
    expect(result.current.hasRecord).toBe(false);
    expect(result.current.failures).toBe(0);
    expect(result.current.lastError).toBeNull();
  });

  it('tells whether the vault has the changes of this device at the end of a sync', async () => {
    const { load, failWhen, keyStore } = await setup();
    const { result } = renderHook(() => useSync(load), { wrapper });
    let outcome = await act(() => result.current.syncNow());
    expect(outcome).toEqual({ sent: true, skipped: false, error: null });
    failWhen(() => true);
    outcome = await act(() => result.current.syncNow());
    expect(outcome.sent).toBe(false);
    expect(outcome.error?.detail?.status).toBe(0);
    failWhen(null);
    // Another tab saved other observations: this sync sends nothing
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeObservation({ date: '2026-10-09' })]));
    expect(await act(() => result.current.syncNow())).toEqual({
      sent: false,
      skipped: false,
      error: null,
    });
    localStorage.removeItem(STORAGE_KEY);
    // Without a record, nothing waits to go
    await keyStore.clear();
    expect(await act(() => result.current.syncNow())).toEqual({
      sent: true,
      skipped: false,
      error: null,
    });
    const broken = vi.fn().mockRejectedValue(new Error('offline'));
    const other = renderHook(() => useSync(broken), { wrapper });
    expect(await act(() => other.result.current.syncNow())).toEqual({
      sent: false,
      skipped: false,
      error: null,
    });
  });

  it('tells that the sync is skipped after a refused save of an edit, without a sync', async () => {
    const { load, runs } = await setup();
    const { result } = renderHook(() => ({ sync: useSync(load), data: useCycleData() }), {
      wrapper,
    });
    const setItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === STORAGE_KEY) throw new Error('QuotaExceededError');
      setItem(key, value);
    });
    act(() => {
      result.current.data.saveObservation(makeObservation({ date: '2026-10-09' }));
    });
    await waitFor(() => expect(result.current.data.saveFailed).toBe(true));
    expect(await act(() => result.current.sync.syncNow())).toEqual({
      sent: false,
      skipped: true,
      error: null,
    });
    expect(runs.count).toBe(0);
  });

  it('reads the shared chart on a reader device, and never merges it with its own days', async () => {
    const { relay, keyStore, services } = await setup();
    const owner = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    const read = await owner.read();
    await owner.write(
      [{ date: '2026-10-01', day: { bleeding: 'H' }, clock: { time: 5, counter: 0, member: 'm' } }],
      read?.etag ?? null
    );
    const reader = await joinMember(relay, keyStore, 'reader');
    const runs = { count: 0, shared: 0 };
    const load = vi.fn(async () => ({
      ...services,
      keyStore: reader.keyStore,
      runner: {
        ...runner,
        runSync: async (input: runner.RunInput) => {
          runs.count += 1;
          return runner.runSync(input);
        },
        readShared: async (...args: Parameters<typeof runner.readShared>) => {
          runs.shared += 1;
          return runner.readShared(...args);
        },
      },
    }));
    const own = [makeObservation({ date: '2026-09-01', bleeding: 'M' })];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(own));
    const { result } = renderHook(() => ({ sync: useSync(load), data: useCycleData() }), {
      wrapper,
    });
    await waitFor(() => expect(localStorage.getItem(SHARED_KEY)).toContain('2026-10-01'));
    expect(runs).toEqual({ count: 0, shared: 1 });
    // The pages get the days of the shared chart after the read
    await waitFor(() =>
      expect(result.current.sync.sharedDays).toEqual([{ date: '2026-10-01', bleeding: 'H' }])
    );
    // The own days of the device stay, and the device has no sync state
    expect(result.current.data.observations.map(o => o.date)).toEqual(['2026-09-01']);
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    expect(await act(() => result.current.sync.syncNow())).toEqual({
      sent: true,
      skipped: false,
      error: null,
    });
    // A read is not a sync of the own days: the backup reminder still counts
    expect(result.current.data.lastSyncDate).toBeNull();
    expect(localStorage.getItem('fertility_care_shared_read')).not.toBeNull();
    expect(result.current.sync.lastSyncedAt).not.toBeNull();
    // A refused save of its own days does not stop the read
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    act(() => {
      result.current.data.saveObservation(makeObservation({ date: '2026-09-02' }));
    });
    await waitFor(() => expect(result.current.data.saveFailed).toBe(true));
    expect((await act(() => result.current.sync.syncNow())).error).toBeNull();
    expect(runs.shared).toBe(3);
    // A removed partner gets the error, and keeps the shared chart
    await removeMember(
      relay,
      keyStore,
      (await keyStore.load()) as DeviceRecord,
      reader.record.memberId
    );
    const outcome = await act(() => result.current.sync.syncNow());
    expect(outcome.sent).toBe(false);
    expect(outcome.error?.detail?.status).toBe(401);
    expect(result.current.sync.lastError?.reason).toBe('relay');
    expect(localStorage.getItem(SHARED_KEY)).toContain('2026-10-01');
    expect(result.current.sync.failures).toBe(1);
  });

  it('gives the days of a valid shared chart, and reads them again after a change in another tab', async () => {
    const { load } = await setup();
    const days = (bleeding: string) =>
      JSON.stringify([
        { date: '2026-10-01', day: { bleeding }, clock: { time: 5, counter: 0, member: 'm' } },
      ]);
    localStorage.setItem(SHARED_KEY, days('H'));
    const { result } = renderHook(() => useSync(load), { wrapper });
    expect(result.current.sharedDays).toEqual([{ date: '2026-10-01', bleeding: 'H' }]);
    const first = result.current.sharedDays;
    // A sync that does not change the text keeps the same days
    await act(() => result.current.syncNow());
    expect(result.current.sharedDays).toBe(first);
    localStorage.setItem(SHARED_KEY, days('M'));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: SHARED_KEY }));
    });
    expect(result.current.sharedDays).toEqual([{ date: '2026-10-01', bleeding: 'M' }]);
    // Text that is not JSON, or a list that is not valid, gives no shared chart
    for (const text of ['not json', '[{"date":"x"}]']) {
      localStorage.setItem(SHARED_KEY, text);
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: null }));
      });
      expect(result.current.sharedDays).toBeNull();
    }
    localStorage.setItem(SHARED_KEY, days('H'));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    });
    expect(result.current.sharedDays).toBeNull();
    localStorage.removeItem(SHARED_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: SHARED_KEY }));
    });
    expect(result.current.sharedDays).toBeNull();
  });

  it('reads the vault as a new device when the observations key was missing at the load', async () => {
    const { load, relay, keyStore } = await setup();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makeObservation({ date: '2026-10-01', bleeding: 'H' })])
    );
    const first = render(load);
    await waitFor(() => expect(first.result.current.lastSyncDate).not.toBeNull());
    first.unmount();
    // The browser lost the observations, but not the sync state
    localStorage.removeItem(STORAGE_KEY);
    expect(localStorage.getItem(STATE_KEY)).not.toBeNull();
    const second = render(load);
    await waitFor(() => expect(second.result.current.observations).toHaveLength(1));
    const store = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    expect((await store.read())?.days.map(d => d.day !== null)).toEqual([true]);
  });

  it('keeps the vault days when the key was missing, a sync failed, and the application loads again', async () => {
    const { load, relay, keyStore } = await setup();
    const days = ['2026-10-01', '2026-10-02', '2026-10-03'].map(date =>
      makeObservation({ date, bleeding: 'H' })
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
    const first = render(load);
    await waitFor(() => expect(first.result.current.lastSyncDate).not.toBeNull());
    first.unmount();
    localStorage.removeItem(STORAGE_KEY);
    // The sync after the missing key fails: the device has no record for a moment
    const load2 = keyStore.load;
    keyStore.load = async () => null;
    const second = render(load);
    await settle();
    second.unmount();
    keyStore.load = load2;
    const third = render(load);
    await waitFor(() => expect(third.result.current.observations).toHaveLength(3));
    const store = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    expect((await store.read())?.days.map(d => d.day !== null)).toEqual([true, true, true]);
  });

  it('keeps a day saved before the first sync on a device without the observations key', async () => {
    const { load, services } = await setup();
    const runSync = services.runner.runSync;
    let first = true;
    services.runner = {
      ...services.runner,
      runSync: async input => {
        if (!first) return runSync(input);
        first = false;
        return { status: 'off' };
      },
    };
    const { result } = render(load);
    await settle();
    act(() => result.current.saveObservation({ date: '2026-10-01', bleeding: 'H' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS);
    });
    await waitFor(() => expect(result.current.lastSyncDate).not.toBeNull());
    expect(result.current.observations.map(o => o.date)).toEqual(['2026-10-01']);
  });

  it('starts again with a first sync after a version without the sync wrote the list', async () => {
    const { load, relay, keyStore } = await setup();
    const days = ['2026-10-01', '2026-10-02'].map(date => makeObservation({ date, bleeding: 'H' }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
    const first = render(load);
    await waitFor(() => expect(first.result.current.lastSyncDate).not.toBeNull());
    first.unmount();
    // An old version writes one day only, and no mark
    const text = JSON.stringify(days.slice(0, 1));
    localStorage.setItem(STORAGE_KEY, text);
    const second = render(load);
    await waitFor(() => expect(second.result.current.observations).toHaveLength(2));
    const store = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    expect((await store.read())?.days.map(d => d.day !== null)).toEqual([true, true]);
    expect(localStorage.getItem('fertility_care_observations_mark')).toBe(
      markOf(localStorage.getItem(STORAGE_KEY) as string)
    );
  });

  it('starts again with a first sync when a tab of a version without the sync writes the list', async () => {
    const { load, relay, keyStore } = await setup();
    const days = ['2026-10-01', '2026-10-02'].map(date => makeObservation({ date, bleeding: 'H' }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
    const { result } = render(load);
    await waitFor(() => expect(result.current.lastSyncDate).not.toBeNull());
    await settle();
    // The old version writes the same format, with one day only and no mark
    const text = serializeObservations(result.current.observations.slice(0, 1));
    localStorage.setItem(STORAGE_KEY, text);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: text }));
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(result.current.observations).toHaveLength(2));
    const store = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    expect((await store.read())?.days.map(d => d.day !== null)).toEqual([true, true]);
  });

  it('forgets the sync state when a tab without the sync writes during a sync or before a save', async () => {
    const { load, relay, keyStore, services } = await setup();
    const days = ['2026-10-01', '2026-10-02'].map(date => makeObservation({ date, bleeding: 'H' }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
    const runSync = services.runner.runSync;
    let during: (() => void) | null = null;
    services.runner = {
      ...services.runner,
      runSync: async input => {
        const result = await runSync(input);
        during?.();
        during = null;
        return result;
      },
    };
    const { result } = render(load);
    await waitFor(() => expect(result.current.lastSyncDate).not.toBeNull());
    await settle();
    const store = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    const oldList = serializeObservations(result.current.observations.slice(0, 1));
    const writeOld = () => {
      localStorage.setItem(STORAGE_KEY, oldList);
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: oldList }));
    };
    // During a sync
    during = writeOld;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(during).toBeNull());
    await waitFor(() => expect(localStorage.getItem(STATE_KEY)).toBeNull());
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(result.current.observations).toHaveLength(2));
    expect((await store.read())?.days.map(d => d.day !== null)).toEqual([true, true]);
    // Before a save in this tab
    await settle();
    act(() => writeOld());
    act(() => result.current.saveObservation({ date: '2026-10-05', bleeding: 'H' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANGE_SYNC_DELAY_MS);
    });
    await waitFor(() => expect(result.current.observations).toHaveLength(3));
    expect((await store.read())?.days.map(d => d.day !== null)).toEqual([true, true, true]);
  });

  it('does not sync a list that another tab changed, and uses a Web Lock when the browser has one', async () => {
    const { load, runs } = await setup();
    const request = vi.fn((_name: string, run: () => Promise<void>) => run());
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    const { result } = render(load);
    await waitFor(() => expect(result.current.lastSyncDate).not.toBeNull());
    expect(request).toHaveBeenCalledWith('fertility-tracker-sync', expect.any(Function));
    await settle();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeObservation({ date: '2026-10-09' })]));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await settle();
    expect(request).toHaveBeenCalledTimes(2);
    expect(runs.count).toBe(1);
    Reflect.deleteProperty(navigator, 'locks');
  });

  it('asks before it deletes more than 7 days', async () => {
    const { load, services } = await setup();
    render(load);
    await settle();
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
