import type React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CycleProvider, useCycleData } from '../../context/CycleContext';
import { LanguageProvider } from '../../context/LanguageContext';
import { serializeObservations } from '../../domain/storageFormat';
import type { SyncConflict } from '../../domain/sync/merge';
import { parseConflicts, serializeConflicts } from '../../domain/sync/syncStorage';
import { createVault } from '../../sync/deviceVault';
import * as runner from '../../sync/syncRunner';
import { makeObservation } from '../../test/factories';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import { useSync } from '../useSync';
import type { SyncServices } from '../useSync';

const STORAGE_KEY = 'fertility_care_observations';
const CONFLICTS_KEY = 'fertility_care_sync_conflicts';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <CycleProvider>{children}</CycleProvider>
  </LanguageProvider>
);

const clock = { time: 1, counter: 0, member: 'other' };
const conflict = (date: string, day: SyncConflict['day']): SyncConflict => ({ date, day, clock });
const storeConflicts = (list: SyncConflict[]) =>
  localStorage.setItem(CONFLICTS_KEY, serializeConflicts(list));
const storedDates = () =>
  parseConflicts(localStorage.getItem(CONFLICTS_KEY)).map(item => item.date);

const servicesLoad = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  await createVault(harness.relay, keyStore);
  const services: SyncServices = { relay: harness.relay, keyStore, runner };
  return vi.fn(async () => services);
};

const render = (load: () => Promise<SyncServices>, enabled = true) =>
  renderHook(
    () => {
      const control = useSync(enabled, load);
      return { control, data: useCycleData() };
    },
    { wrapper }
  );

describe('useSync conflict list', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives no conflict while the sync is off', () => {
    storeConflicts([conflict('2026-10-01', { bleeding: 'H' })]);
    const load = vi.fn();
    const { result } = render(load, false);
    expect(result.current.control.conflicts).toEqual([]);
    window.dispatchEvent(new StorageEvent('storage', { key: CONFLICTS_KEY }));
    expect(result.current.control.conflicts).toEqual([]);
  });

  it('reads the list at the start, after a sync and when another tab changes it', async () => {
    storeConflicts([conflict('2026-10-01', { bleeding: 'H' })]);
    const { result } = render(await servicesLoad());
    expect(result.current.control.conflicts.map(item => item.date)).toEqual(['2026-10-01']);
    await waitFor(() => expect(result.current.data.lastSyncDate).not.toBeNull());

    storeConflicts([]);
    await act(async () => {
      await result.current.control.syncNow();
    });
    expect(result.current.control.conflicts).toEqual([]);

    storeConflicts([conflict('2026-10-02', null)]);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    });
    expect(result.current.control.conflicts).toEqual([]);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: CONFLICTS_KEY }));
    });
    expect(result.current.control.conflicts.map(item => item.date)).toEqual(['2026-10-02']);

    // localStorage.clear() in another tab gives the key null
    localStorage.removeItem(CONFLICTS_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(result.current.control.conflicts).toEqual([]);
  });

  it('dismisses a conflict: the observation stays', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      serializeObservations([makeObservation({ date: '2026-10-01', bleeding: 'H' })])
    );
    storeConflicts([conflict('2026-10-01', { bleeding: 'L' }), conflict('2026-10-02', null)]);
    const { result } = render(await servicesLoad());
    await act(async () => {
      await result.current.control.resolveConflict('2026-10-01', false);
    });
    expect(storedDates()).toEqual(['2026-10-02']);
    expect(result.current.control.conflicts.map(item => item.date)).toEqual(['2026-10-02']);
    expect(result.current.data.observations[0]?.bleeding).toBe('H');
  });

  it('restores the version of a conflict and keeps the Peak Day mark of the date', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      serializeObservations([
        makeObservation({ date: '2026-10-01', stretch: '10', isManualPeak: true }),
      ])
    );
    storeConflicts([conflict('2026-10-01', { stretch: '8', modifiers: ['C'], notes: 'n' })]);
    const { result } = render(await servicesLoad());
    await act(async () => {
      await result.current.control.resolveConflict('2026-10-01', true);
    });
    const restored = result.current.data.observations.find(o => o.date === '2026-10-01');
    expect(restored).toMatchObject({ stretch: '8', modifiers: ['C'], notes: 'n' });
    expect(restored?.isManualPeak).toBe(true);
    expect(storedDates()).toEqual([]);
  });

  it('restores a day on a date without an observation', async () => {
    storeConflicts([conflict('2026-10-03', { bleeding: 'M' })]);
    const { result } = render(await servicesLoad());
    await act(async () => {
      await result.current.control.resolveConflict('2026-10-03', true);
    });
    const restored = result.current.data.observations.find(o => o.date === '2026-10-03');
    expect(restored?.bleeding).toBe('M');
    expect(restored?.isManualPeak).toBeFalsy();
  });

  it('restores a deletion: the observation of the date goes', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      serializeObservations([
        makeObservation({ date: '2026-10-01', bleeding: 'H' }),
        makeObservation({ date: '2026-10-02', bleeding: 'M' }),
      ])
    );
    storeConflicts([conflict('2026-10-01', null), conflict('2026-10-05', null)]);
    const { result } = render(await servicesLoad());
    await act(async () => {
      await result.current.control.resolveConflict('2026-10-01', true);
    });
    expect(result.current.data.observations.map(o => o.date)).toEqual(['2026-10-02']);
    // A deletion on a date without an observation changes no observation
    await act(async () => {
      await result.current.control.resolveConflict('2026-10-05', true);
    });
    expect(result.current.data.observations.map(o => o.date)).toEqual(['2026-10-02']);
    expect(storedDates()).toEqual([]);
  });

  it('changes nothing when another tab resolved the conflict', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      serializeObservations([makeObservation({ date: '2026-10-01', bleeding: 'H' })])
    );
    storeConflicts([conflict('2026-10-01', { bleeding: 'L' })]);
    const { result } = render(await servicesLoad());
    storeConflicts([]);
    await act(async () => {
      await result.current.control.resolveConflict('2026-10-01', true);
    });
    expect(result.current.data.observations[0]?.bleeding).toBe('H');
    expect(result.current.control.conflicts).toEqual([]);
  });
});
