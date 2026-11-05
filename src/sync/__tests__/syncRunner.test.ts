import { describe, expect, it } from 'vitest';
import { serializeSyncState } from '../../domain/sync/syncStorage';
import { parseConflicts, parseSyncState } from '../../domain/sync/syncStorage';
import { makeObservation } from '../../test/factories';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import type { ObservationInput } from '../../types/crms';
import { STORAGE_SYNC_CONFLICTS_KEY, STORAGE_SYNC_STATE_KEY } from '../../utils/storageKeys';
import { createVault, vaultStoreOf } from '../deviceVault';
import type { DeviceRecord } from '../keyStore';
import { finishSync, runSync } from '../syncRunner';
import type { RunInput, SyncStorage } from '../syncRunner';

const memoryStorage = (): SyncStorage & { items: Map<string, string> } => {
  const items = new Map<string, string>();
  return {
    items,
    read: key => items.get(key) ?? null,
    write: (key, value) => {
      items.set(key, value);
      return true;
    },
    remove: key => {
      items.delete(key);
    },
  };
};

const day = (date: string, bleeding: 'H' | 'M') =>
  makeObservation({ id: `obs_${date}`, date, bleeding, codeString: bleeding });

const setup = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  await createVault(harness.relay, keyStore);
  const storage = memoryStorage();
  const input = (observations = [day('2026-10-01', 'H')]): RunInput => ({
    relay: harness.relay,
    keyStore,
    storage,
    observations,
    observationsMissing: false,
    recoveryData: false,
    saveFailed: false,
    now: 1_000,
    confirmDeletions: async () => true,
  });
  return { ...harness, keyStore, storage, input };
};

describe('runSync', () => {
  it('gives off without a device record', async () => {
    const { input } = await setup();
    expect(await runSync({ ...input(), keyStore: createMemoryKeyStore() })).toEqual({
      status: 'off',
    });
  });

  it('syncs as a first sync, then with the stored state', async () => {
    const { input, storage, relay, keyStore } = await setup();
    const first = await runSync(input());
    expect(first.status).toBe('synced');
    let applied: ObservationInput[] = [];
    expect(
      finishSync(first, {
        storage,
        sent: input().observations,
        current: input().observations,
        applyObservations: observations => {
          applied = observations;
          return true;
        },
      })
    ).toBe(true);
    expect(applied.map(o => o.date)).toEqual(['2026-10-01']);
    const state = parseSyncState(storage.read(STORAGE_SYNC_STATE_KEY));
    expect(state?.member).toBe(((await keyStore.load()) as DeviceRecord).memberId);
    expect(state?.base).toHaveLength(1);
    // The vault has the day of the device
    const store = vaultStoreOf(relay, keyStore, (await keyStore.load()) as DeviceRecord);
    expect((await store.read())?.days.map(d => d.date)).toEqual(['2026-10-01']);
    // A change after the first sync wins over the vault
    const second = await runSync({ ...input([day('2026-10-01', 'M')]), now: 2_000 });
    expect(second.status === 'synced' && second.observations[0]?.bleeding).toBe('M');
  });

  it('uses a new state for a stored state of another member', async () => {
    const { input, storage } = await setup();
    storage.write(
      STORAGE_SYNC_STATE_KEY,
      serializeSyncState({
        member: 'other',
        clock: { time: 9, counter: 0, member: 'other' },
        local: [],
        base: [],
      })
    );
    const result = await runSync(input());
    expect(result.status === 'synced' && result.state.member).not.toBe('other');
  });

  it('gives an error for a vault error, and throws the other errors', async () => {
    const { input, failWhen, keyStore } = await setup();
    failWhen(() => true);
    const result = await runSync(input());
    expect(result.status === 'error' && result.error.reason).toBe('relay');
    failWhen(null);
    keyStore.load = async () => {
      throw new Error('storage');
    };
    await expect(runSync(input())).rejects.toThrow('storage');
    const other = await setup();
    other.keyStore.save = async () => {
      throw new Error('full');
    };
    await expect(runSync(other.input())).rejects.toThrow('full');
  });
});

describe('finishSync', () => {
  const base = { sent: [], current: [], applyObservations: () => true };

  it('keeps the state of a failed save, and adds the conflicts after a save', async () => {
    const { input, storage } = await setup();
    const result = await runSync(input());
    expect(finishSync(result, { ...base, storage, applyObservations: () => false })).toBe(false);
    expect(storage.read(STORAGE_SYNC_STATE_KEY)).toBeNull();
    // An edit during the sync keeps the current day, and the merged day goes to the conflicts
    const sent = input().observations;
    const current = [day('2026-10-01', 'M')];
    const changed = {
      ...(result as Extract<typeof result, { status: 'synced' }>),
      changedDates: ['2026-10-01'],
    };
    expect(finishSync(changed, { storage, sent, current, applyObservations: () => true })).toBe(
      true
    );
    expect(parseConflicts(storage.read(STORAGE_SYNC_CONFLICTS_KEY)).map(c => c.date)).toEqual([
      '2026-10-01',
    ]);
  });

  it('deletes the sync state when its write fails, and gives false when the conflicts do not save', async () => {
    const { input, storage } = await setup();
    const result = await runSync(input());
    storage.write(STORAGE_SYNC_STATE_KEY, 'old');
    const write = storage.write;
    storage.write = (key, value) => key !== STORAGE_SYNC_STATE_KEY && write(key, value);
    expect(finishSync(result, { ...base, storage })).toBe(false);
    expect(storage.read(STORAGE_SYNC_STATE_KEY)).toBeNull();
    expect(storage.read(STORAGE_SYNC_CONFLICTS_KEY)).toBeNull();
    storage.write = (key, value) => key !== STORAGE_SYNC_CONFLICTS_KEY && write(key, value);
    expect(finishSync(result, { ...base, storage })).toBe(false);
    expect(storage.read(STORAGE_SYNC_STATE_KEY)).not.toBeNull();
  });

  it('writes the state of a cancelled or busy result, and nothing for the other results', async () => {
    const storage = memoryStorage();
    const state = {
      member: 'm',
      clock: { time: 1, counter: 0, member: 'm' },
      local: [],
      base: null,
    };
    expect(finishSync({ status: 'busy', state }, { ...base, storage })).toBe(false);
    expect(parseSyncState(storage.read(STORAGE_SYNC_STATE_KEY))).toEqual(state);
    storage.items.clear();
    expect(finishSync({ status: 'cancelled', state }, { ...base, storage })).toBe(false);
    expect(storage.items.size).toBe(1);
    storage.items.clear();
    for (const result of [{ status: 'off' }, { status: 'skipped', reason: 'saveFailed' }] as const)
      expect(finishSync(result, { ...base, storage })).toBe(false);
    expect(storage.items.size).toBe(0);
  });
});
