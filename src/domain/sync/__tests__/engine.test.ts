import { describe, expect, it, vi } from 'vitest';
import { createMemoryVaultStore } from '../../../test/memoryVaultStore';
import { makeObservation } from '../../../test/factories';
import type { Observation, ObservationInput } from '../../../types/crms';
import { zeroClock } from '../clock';
import {
  MAX_DELETIONS_WITHOUT_CONFIRMATION,
  MAX_SYNC_ATTEMPTS,
  dropBase,
  newSyncState,
  syncOnce,
} from '../engine';
import type { SyncInput, SyncResult, SyncState, VaultStore } from '../engine';

type Store = ReturnType<typeof createMemoryVaultStore>;

/** One device: its observations and its sync state, as the application keeps them. */
const device = (member: string, observations: Observation[] = []) => {
  const self = {
    observations,
    state: newSyncState(member, observations),
    async sync(
      store: VaultStore,
      now: number,
      extra: Partial<SyncInput> = {}
    ): Promise<SyncResult> {
      const result = await syncOnce({
        state: self.state,
        observations: self.observations,
        store,
        now,
        recoveryData: false,
        saveFailed: false,
        observationsMissing: false,
        confirmDeletions: async () => true,
        ...extra,
      });
      if (result.status === 'synced') {
        self.observations = result.observations.map(input => toObservation(member, input));
      }
      if (result.status !== 'skipped') self.state = result.state;
      return result;
    },
  };
  return self;
};

const toObservation = (member: string, input: ObservationInput): Observation =>
  ({
    ...makeObservation({ date: input.date as string }),
    ...input,
    id: `${member}_${input.date}`,
  }) as Observation;

const dates = (observations: Observation[]) => observations.map(o => o.date);
const synced = (result: SyncResult) => {
  if (result.status !== 'synced') throw new Error(`status ${result.status}`);
  return result;
};

describe('syncOnce', () => {
  it('creates the vault, then brings the change of one device to the other', async () => {
    const store: Store = createMemoryVaultStore();
    const phone = device('phone', [makeObservation({ date: '2026-10-01', bleeding: 'H' })]);
    const tablet = device('tablet');

    expect(synced(await phone.sync(store, 1000)).changed).toBe(false);
    expect(store.writes).toBe(1);
    expect(synced(await tablet.sync(store, 1000)).changed).toBe(true);
    expect(dates(tablet.observations)).toEqual(['2026-10-01']);

    tablet.observations = [
      ...tablet.observations,
      makeObservation({ date: '2026-10-02', stretch: '0' }),
    ];
    await tablet.sync(store, 2000);
    expect(synced(await phone.sync(store, 3000)).changed).toBe(true);
    expect(dates(phone.observations)).toEqual(['2026-10-01', '2026-10-02']);
    // Nothing changed: no write
    const writes = store.writes;
    expect(synced(await phone.sync(store, 4000)).changed).toBe(false);
    expect(store.writes).toBe(writes);
  });

  it('lets the vault win on each date when a device with observations joins', async () => {
    const store = createMemoryVaultStore();
    const phone = device('phone', [makeObservation({ date: '2026-10-01', stretch: '10' })]);
    await phone.sync(store, 1000);
    // A date of the phone that changes later still wins over the joining day
    phone.observations = [makeObservation({ date: '2026-10-01', stretch: '8' })];
    await phone.sync(store, 2000);

    const tablet = device('tablet', [
      makeObservation({ date: '2026-10-01', stretch: '0' }),
      makeObservation({ date: '2026-10-03', stretch: '2' }),
    ]);
    const result = synced(await tablet.sync(store, 500));
    expect(result.conflicts).toEqual([
      { date: '2026-10-01', day: { stretch: '0' }, clock: zeroClock('tablet') },
    ]);
    expect(tablet.observations.map(o => [o.date, o.stretch])).toEqual([
      ['2026-10-01', '8'],
      ['2026-10-03', '2'],
    ]);
  });

  it('reads and merges again when a different device wrote after the read', async () => {
    const store = createMemoryVaultStore();
    const phone = device('phone', [makeObservation({ date: '2026-10-01', stretch: '0' })]);
    const tablet = device('tablet');
    await phone.sync(store, 1000);
    await tablet.sync(store, 1000);

    // The tablet writes its change between the read and the write of the phone
    tablet.observations = [
      ...tablet.observations,
      makeObservation({ date: '2026-10-02', stretch: '2' }),
    ];
    const copy = createMemoryVaultStore(store.days());
    await tablet.sync(copy, 2000);
    store.changeBeforeNextWrite(copy.days());
    phone.observations = [
      ...phone.observations,
      makeObservation({ date: '2026-10-03', stretch: '4' }),
    ];

    const result = synced(await phone.sync(store, 3000));
    expect(store.rejected).toBe(1);
    expect(result.observations.map(o => o.date)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
    expect(store.days().map(d => d.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('stops after the last attempt with the status busy', async () => {
    const store = createMemoryVaultStore();
    const phone = device('phone', [makeObservation({ date: '2026-10-01', stretch: '0' })]);
    for (let i = 0; i < MAX_SYNC_ATTEMPTS; i++) store.changeBeforeNextWrite([]);
    const result = await phone.sync(store, 1000);
    expect(result.status).toBe('busy');
    expect(store.rejected).toBe(MAX_SYNC_ATTEMPTS);
    // The stamped days stay in the state, but there is still no base
    expect(phone.state.base).toBeNull();
  });

  it('skips the sync while recovery data exists or the last save failed', async () => {
    const store = createMemoryVaultStore();
    const read = vi.spyOn(store, 'read');
    const phone = device('phone', [makeObservation({ date: '2026-10-01' })]);
    expect(await phone.sync(store, 1, { recoveryData: true })).toEqual({
      status: 'skipped',
      reason: 'recoveryData',
    });
    expect(await phone.sync(store, 1, { saveFailed: true })).toEqual({
      status: 'skipped',
      reason: 'saveFailed',
    });
    expect(read).not.toHaveBeenCalled();
  });

  it('reads the vault as a new device when the observations key is missing', async () => {
    const store = createMemoryVaultStore();
    const phone = device('phone', [
      makeObservation({ date: '2026-10-01', stretch: '0' }),
      makeObservation({ date: '2026-10-02', stretch: '2' }),
    ]);
    await phone.sync(store, 1000);
    phone.observations = [];
    const result = synced(await phone.sync(store, 2000, { observationsMissing: true }));
    expect(dates(phone.observations)).toEqual(['2026-10-01', '2026-10-02']);
    expect(result.changed).toBe(true);
    expect(store.days().every(d => d.day !== null)).toBe(true);
  });

  it('asks before it deletes more than 7 days, and does not write after a no', async () => {
    const days = Array.from({ length: MAX_DELETIONS_WITHOUT_CONFIRMATION + 1 }, (_, i) =>
      makeObservation({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, stretch: '0' })
    );
    const store = createMemoryVaultStore();
    const phone = device('phone', days);
    const tablet = device('tablet');
    await phone.sync(store, 1000);
    await tablet.sync(store, 1000);
    tablet.observations = [];
    await tablet.sync(store, 2000);

    const vault = store.days();
    const no = vi.fn(async () => false);
    expect((await phone.sync(store, 3000, { confirmDeletions: no })).status).toBe('cancelled');
    expect(no).toHaveBeenCalledWith(days.map(d => d.date));
    expect(phone.observations).toHaveLength(days.length);
    expect(store.days()).toEqual(vault);

    const yes = vi.fn(async () => true);
    await phone.sync(store, 4000, { confirmDeletions: yes });
    expect(phone.observations).toEqual([]);
  });

  it('does not ask for 7 deleted days or fewer', async () => {
    const store = createMemoryVaultStore();
    const days = Array.from({ length: MAX_DELETIONS_WITHOUT_CONFIRMATION }, (_, i) =>
      makeObservation({ date: `2026-10-0${i + 1}`, stretch: '0' })
    );
    const phone = device('phone', days);
    const tablet = device('tablet');
    await phone.sync(store, 1000);
    await tablet.sync(store, 1000);
    tablet.observations = [];
    await tablet.sync(store, 2000);
    const ask = vi.fn(async () => false);
    await phone.sync(store, 3000, { confirmDeletions: ask });
    expect(ask).not.toHaveBeenCalled();
    expect(phone.observations).toEqual([]);
  });

  it('moves the manual Peak Day on all devices', async () => {
    const store = createMemoryVaultStore();
    const phone = device('phone', [
      makeObservation({ date: '2026-10-01', bleeding: 'H' }),
      makeObservation({ date: '2026-10-10', stretch: '10', isManualPeak: true }),
      makeObservation({ date: '2026-10-11', stretch: '10' }),
    ]);
    const tablet = device('tablet');
    await phone.sync(store, 1000);
    await tablet.sync(store, 1000);
    // The application clears the Peak Day of the cycle when the user sets a new one
    tablet.observations = tablet.observations.map(o => ({
      ...o,
      isManualPeak: o.date === '2026-10-11',
    }));
    await tablet.sync(store, 2000);
    await phone.sync(store, 3000);
    expect(phone.observations.filter(o => o.isManualPeak).map(o => o.date)).toEqual(['2026-10-11']);
  });

  it('keeps the clock later than each clock that it received', async () => {
    const store = createMemoryVaultStore();
    const phone = device('phone', [makeObservation({ date: '2026-10-01', stretch: '0' })]);
    await phone.sync(store, 9000);
    phone.observations = [makeObservation({ date: '2026-10-01', stretch: '4' })];
    await phone.sync(store, 9000);
    const tablet = device('tablet');
    await tablet.sync(store, 10);
    expect(tablet.state.clock.time).toBe(9000);
    tablet.observations = [makeObservation({ date: '2026-10-01', stretch: '2' })];
    await tablet.sync(store, 20);
    await phone.sync(store, 9001);
    expect(phone.observations[0]?.stretch).toBe('2');
  });
});

describe('syncOnce with random changes', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
    'gives the same days on all devices (seed %i)',
    async start => {
      // A small deterministic generator: the test is the same on each run
      let seed = start;
      const random = (n: number) => {
        // mulberry32
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return (((t ^ (t >>> 14)) >>> 0) % 1000) % n;
      };
      const STRETCH = ['0', '2', '4', '6', '8', '10'] as const;
      const store = createMemoryVaultStore();
      const devices = [device('phone'), device('tablet'), device('laptop')];
      let now = 1000;
      for (let round = 0; round < 30; round++) {
        for (const d of devices) {
          const date = `2026-10-${String(random(12) + 1).padStart(2, '0')}`;
          const rest = d.observations.filter(o => o.date !== date);
          const action = random(4);
          if (action === 0) {
            d.observations = rest;
          } else if (action === 1) {
            // Set the Peak Day as the application does: one in the cycle
            d.observations = [...rest, makeObservation({ date, stretch: '10' })].map(o => ({
              ...o,
              isManualPeak: o.date === date,
            }));
          } else {
            d.observations = [...rest, makeObservation({ date, stretch: STRETCH[random(6)] })];
          }
          // Only some devices sync in each round, so the changes are concurrent
          if (random(2) === 0) await d.sync(store, (now += random(3)));
        }
      }
      for (let pass = 0; pass < 2; pass++) {
        for (const d of devices) synced(await d.sync(store, (now += 1)));
      }
      const view = (d: (typeof devices)[number]) =>
        d.observations.map(o => [o.date, o.stretch ?? null, o.isManualPeak === true]);
      expect(view(devices[1] as (typeof devices)[number])).toEqual(
        view(devices[0] as (typeof devices)[number])
      );
      expect(view(devices[2] as (typeof devices)[number])).toEqual(
        view(devices[0] as (typeof devices)[number])
      );
      expect(devices[0]?.observations.filter(o => o.isManualPeak).length).toBeLessThanOrEqual(1);
      expect(devices[0]?.observations.length).toBeGreaterThan(3);
    }
  );
});

describe('dropBase', () => {
  it('removes the base and gives the days the zero clock', () => {
    const state: SyncState = {
      member: 'phone',
      clock: { time: 5, counter: 0, member: 'phone' },
      local: [],
      base: [],
    };
    expect(dropBase(state, [makeObservation({ date: '2026-10-01', stretch: '0' })])).toEqual({
      ...state,
      base: null,
      local: [{ date: '2026-10-01', day: { stretch: '0' }, clock: zeroClock('phone') }],
    });
  });
});
