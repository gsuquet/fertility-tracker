/**
 * Starts the sync of the application: at the start, when the page becomes visible, when the
 * browser goes online and after a change. See docs/reference/sync-client.md.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { formatMessage } from '../i18n';
import type { VaultError } from '../sync/deviceVault';
import type { KeyStore } from '../sync/keyStore';
import type { RelayClient } from '../sync/relayClient';
import { serializeObservations } from '../domain/storageFormat';
import { compareClocks } from '../domain/sync/clock';
import type { SyncConflict } from '../domain/sync/merge';
import { parseConflicts, serializeConflicts } from '../domain/sync/syncStorage';
import { parseVaultDays, toObservationInputs } from '../domain/sync/vaultContent';
import type { ObservationInput } from '../types/crms';
import { readStorage, removeStorage, writeStorage } from '../utils/storage';
import {
  STORAGE_OBSERVATIONS_KEY,
  STORAGE_SHARED_CHART_KEY,
  STORAGE_LAST_SYNC_AT_KEY,
  STORAGE_SYNC_CONFLICTS_KEY,
  STORAGE_SYNC_STATE_KEY,
} from '../utils/storageKeys';
import { checkStoredMark, distrustCount } from '../utils/syncTrust';

/** A page that becomes visible syncs only when the last sync started this long ago. */
export const VISIBLE_SYNC_INTERVAL_MS = 60_000;
/** A change syncs after this time without a new change. */
export const CHANGE_SYNC_DELAY_MS = 5_000;

export interface SyncServices {
  relay: RelayClient;
  keyStore: KeyStore;
  runner: typeof import('../sync/syncRunner');
}

/** Loads the sync code at the start. A device without a record does not call the relay. */
const loadServices = async (): Promise<SyncServices> => {
  const [runner, relayClient, keyStore] = await Promise.all([
    import('../sync/syncRunner'),
    import('../sync/relayClient'),
    import('../sync/keyStore'),
  ]);
  return {
    runner,
    relay: relayClient.createRelayClient(),
    keyStore: keyStore.openKeyStore(),
  };
};

const storage = { read: readStorage, write: writeStorage, remove: removeStorage };

/** One sync at a time for all the tabs of the application, when the browser has Web Locks. */
const withSyncLock = <T>(run: () => Promise<T>): Promise<T> =>
  globalThis.navigator?.locks
    ? globalThis.navigator.locks.request('fertility-tracker-sync', run)
    : run();

/** The end of one sync. `sent` is true when the vault has the changes of this device, or without a record. */
export interface SyncOutcome {
  sent: boolean;
  /** True when the device cannot sync its list: unreadable data or a refused save. */
  skipped: boolean;
  error: VaultError | null;
}

const NOT_SENT: SyncOutcome = { sent: false, skipped: false, error: null };
const SKIPPED: SyncOutcome = { sent: false, skipped: true, error: null };

/** The sync for the Settings screen. */
export interface SyncControl {
  /** The relay client, the key store and the sync code, loaded one time. */
  services: () => Promise<SyncServices>;
  /** Starts a sync at once, or after the sync that runs. It resolves when that sync ends. */
  syncNow: () => Promise<SyncOutcome>;
  /**
   * Runs an action of Settings after the sync that runs, with the sync lock. No sync starts
   * before the action ends.
   */
  withSync: <T>(action: (services: SyncServices) => Promise<T>) => Promise<T>;
  /** The error of the last sync, or null after a sync without an error. */
  lastError: VaultError | null;
  /** The days that lost a conflict, sorted by date. */
  conflicts: SyncConflict[];
  /**
   * Restores the version of the conflict, or only removes the conflict from the list. Nothing
   * changes when the list no longer has this conflict.
   */
  resolveConflict: (conflict: SyncConflict, restore: boolean) => Promise<void>;
  /** The days of the shared chart of a partner device, or null. */
  sharedDays: ObservationInput[] | null;
  /** True when the key store had a record at the last sync or action. Null before the first sync. */
  hasRecord: boolean | null;
  /** The number of syncs in a row that ended with an error. */
  failures: number;
  /** The time of the last full sync in milliseconds, or null. */
  lastSyncedAt: number | null;
}

/** The stored time of the last full sync, or null without a valid one. */
const storedSyncTime = (): number | null => {
  const time = Number(readStorage(STORAGE_LAST_SYNC_AT_KEY) ?? Number.NaN);
  return Number.isFinite(time) ? time : null;
};

/** Saves the time of a full sync. A refused write keeps the older time. */
const saveSyncTime = () => writeStorage(STORAGE_LAST_SYNC_AT_KEY, String(Date.now()));

const storedConflicts = () => parseConflicts(readStorage(STORAGE_SYNC_CONFLICTS_KEY));

/** The days of the stored shared chart, or null without a valid one. */
const storedSharedDays = (): ObservationInput[] | null => {
  const text = readStorage(STORAGE_SHARED_CHART_KEY);
  if (text === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const days = parseVaultDays(value);
  return days && toObservationInputs(days);
};

export function useSync(load: () => Promise<SyncServices> = loadServices): SyncControl {
  const data = useCycleData();
  const { t } = useLanguage();
  const latest = useRef({ data, t });
  latest.current = { data, t };
  const loaded = useRef<Promise<SyncServices> | null>(null);
  // The syncs and the actions of this tab, one after the other
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // A sync that did not start yet. A new call does not add a second one.
  const waiting = useRef<Promise<SyncOutcome> | null>(null);
  const lastStart = useRef(0);
  const appliedBySync = useRef(false);
  const [lastError, setLastError] = useState<VaultError | null>(null);
  const [hasRecord, setHasRecord] = useState<boolean | null>(null);
  const [failures, setFailures] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState(storedSyncTime);
  /** Counts a sync that ended with an error, or starts the count again. */
  const endSync = useCallback((error: VaultError | null) => {
    setLastError(error);
    setFailures(count => (error ? count + 1 : 0));
  }, []);
  const [conflicts, setConflicts] = useState<SyncConflict[]>(storedConflicts);
  const [sharedDays, setSharedDays] = useState<ObservationInput[] | null>(storedSharedDays);
  // The shared chart changes only when its stored text changes: the pages keep their data
  const sharedText = useRef(readStorage(STORAGE_SHARED_CHART_KEY));
  const readConflicts = useCallback(() => {
    setConflicts(storedConflicts());
    setLastSyncedAt(storedSyncTime());
    const text = readStorage(STORAGE_SHARED_CHART_KEY);
    if (text === sharedText.current) return;
    sharedText.current = text;
    setSharedDays(storedSharedDays());
  }, []);

  const services = useCallback(() => {
    // A failed load loads again at the next call
    loaded.current ??= load().catch(error => {
      loaded.current = null;
      throw error;
    });
    return loaded.current;
  }, [load]);

  // Each sync and each action can change the conflict list
  const exclusive = useCallback(
    <T>(work: () => Promise<T>): Promise<T> => {
      const next = queue.current.then(() => withSyncLock(work)).finally(readConflicts);
      queue.current = next.catch(() => {});
      return next;
    },
    [readConflicts]
  );

  const sync = useCallback((): Promise<SyncOutcome> => {
    if (waiting.current) return waiting.current;
    const next = exclusive(async (): Promise<SyncOutcome> => {
      waiting.current = null;
      lastStart.current = Date.now();
      try {
        const { runner, relay, keyStore } = await services();
        // A reader device only reads the shared chart: the checks of its own days do not apply
        const record = await keyStore.load();
        setHasRecord(record !== null);
        if (record?.role === 'reader') {
          const shared = await runner.readShared(relay, keyStore, record, storage);
          // No markSynced(): the own days go nowhere, so the backup reminder still counts
          endSync(shared.error);
          if (shared.saved && !shared.error) saveSyncTime();
          return { sent: shared.error === null, skipped: false, error: shared.error };
        }
        const sent = latest.current.data;
        // The list of this tab cannot sync: a refused save, or data that is not readable
        if (sent.saveFailed || sent.recoveryData !== null) return SKIPPED;
        // Another tab saved other observations: this tab gets them first, with the storage event
        const stored = readStorage(STORAGE_OBSERVATIONS_KEY);
        if (stored !== null && stored !== serializeObservations(sent.observations)) {
          return NOT_SENT;
        }
        // A version without the sync wrote the list: the sync starts again as a first sync
        checkStoredMark(stored);
        const trust = distrustCount();
        const result = await runner.runSync({
          relay,
          keyStore,
          storage,
          observations: sent.observations,
          // The provider deleted the sync state when the key was missing at the load
          observationsMissing: false,
          recoveryData: sent.recoveryData !== null,
          saveFailed: sent.saveFailed,
          now: Date.now(),
          confirmDeletions: async dates =>
            window.confirm(
              formatMessage(latest.current.t.sync.confirmDeletions, { count: dates.length })
            ),
        });
        const saved = runner.finishSync(result, {
          storage,
          sent: sent.observations,
          current: latest.current.data.observations,
          applyObservations: (observations, changed) => {
            appliedBySync.current = true;
            const ok = latest.current.data.applySyncedObservations(observations, changed);
            if (!ok) appliedBySync.current = false;
            return ok;
          },
        });
        endSync(result.status === 'error' ? result.error : null);
        // A list without its mark came during the sync: the state of the sync must not stay
        if (distrustCount() !== trust) removeStorage(STORAGE_SYNC_STATE_KEY);
        if (saved) {
          latest.current.data.markSynced();
          saveSyncTime();
        }
        return {
          sent: result.status === 'synced' || result.status === 'off',
          skipped: result.status === 'skipped',
          error: result.status === 'error' ? result.error : null,
        };
      } catch {
        // The key store or the code did not load: the next event loads it again
        loaded.current = null;
        return NOT_SENT;
      }
    });
    waiting.current = next;
    return next;
  }, [exclusive, services, endSync]);

  const resolveConflict = useCallback(
    (shown: SyncConflict, restore: boolean) =>
      exclusive(async () => {
        // Another tab or a sync can change the list: the stored list is the current one. A sync
        // can replace the conflict of the date with a newer one that the user did not see.
        const { date } = shown;
        const list = storedConflicts();
        const conflict = list.find(
          item => item.date === date && compareClocks(item.clock, shown.clock) === 0
        );
        if (!conflict) return;
        if (restore) {
          const { observations, saveObservation, deleteObservation } = latest.current.data;
          const current = observations.find(observation => observation.date === date);
          if (conflict.day !== null) {
            // The Peak Day mark has its own clock: the current mark stays
            saveObservation({ date, ...conflict.day, isManualPeak: current?.isManualPeak });
          } else if (current) {
            deleteObservation(current.id);
          }
        }
        writeStorage(
          STORAGE_SYNC_CONFLICTS_KEY,
          serializeConflicts(list.filter(item => item !== conflict))
        );
      }),
    [exclusive]
  );

  // Another tab changed the conflict list
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const { key } = event;
      if (
        key === STORAGE_SYNC_CONFLICTS_KEY ||
        key === STORAGE_SHARED_CHART_KEY ||
        key === STORAGE_LAST_SYNC_AT_KEY ||
        key === null
      ) {
        readConflicts();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [readConflicts]);

  const withSync = useCallback(
    <T>(action: (loaded: SyncServices) => Promise<T>): Promise<T> =>
      exclusive(async () => {
        const loaded = await services();
        try {
          return await action(loaded);
        } finally {
          // An action can save or delete the record
          const record = await loaded.keyStore.load().catch(() => undefined);
          if (record !== undefined) {
            setHasRecord(record !== null);
            if (record === null) endSync(null);
          }
        }
      }),
    [exclusive, services, endSync]
  );

  // The start of the application, the visible page and the online browser
  useEffect(() => {
    void sync();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastStart.current >= VISIBLE_SYNC_INTERVAL_MS) void sync();
    };
    const onOnline = () => void sync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [sync]);

  // A change of the observations on this device, but not a change from a sync. A change from a
  // sync does not stop the wait of an earlier change.
  const { observations } = data;
  const seen = useRef(observations);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (seen.current === observations) return;
    seen.current = observations;
    if (appliedBySync.current) {
      appliedBySync.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void sync(), CHANGE_SYNC_DELAY_MS);
  }, [sync, observations]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // The same object while no field changes: the effects of the dialogs do not start again
  return useMemo(
    () => ({
      services,
      syncNow: sync,
      withSync,
      lastError,
      conflicts,
      resolveConflict,
      sharedDays,
      hasRecord,
      failures,
      lastSyncedAt,
    }),
    [
      services,
      sync,
      withSync,
      lastError,
      conflicts,
      resolveConflict,
      sharedDays,
      hasRecord,
      failures,
      lastSyncedAt,
    ]
  );
}
