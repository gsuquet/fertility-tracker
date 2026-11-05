/**
 * Starts the sync of the application: at the start, when the page becomes visible, when the
 * browser goes online and after a change. See docs/reference/sync-client.md.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { formatMessage } from '../i18n';
import { SYNC_ENABLED } from '../sync/syncFlag';
import type { KeyStore } from '../sync/keyStore';
import type { RelayClient } from '../sync/relayClient';
import { serializeObservations } from '../domain/storageFormat';
import { readStorage, removeStorage, writeStorage } from '../utils/storage';
import { STORAGE_OBSERVATIONS_KEY } from '../utils/storageKeys';

/** A page that becomes visible syncs only when the last sync started this long ago. */
export const VISIBLE_SYNC_INTERVAL_MS = 60_000;
/** A change syncs after this time without a new change. */
export const CHANGE_SYNC_DELAY_MS = 5_000;

export interface SyncServices {
  relay: RelayClient;
  keyStore: KeyStore;
  runner: typeof import('../sync/syncRunner');
}

/** Loads the sync code only when the sync is on. */
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
const withSyncLock = (run: () => Promise<void>): Promise<void> =>
  globalThis.navigator?.locks
    ? globalThis.navigator.locks.request('fertility-tracker-sync', run)
    : run();

export function useSync(
  enabled: boolean = SYNC_ENABLED,
  load: () => Promise<SyncServices> = loadServices
): void {
  const data = useCycleData();
  const { t } = useLanguage();
  const latest = useRef({ data, t });
  latest.current = { data, t };
  const services = useRef<Promise<SyncServices> | null>(null);
  const running = useRef(false);
  const again = useRef(false);
  const lastStart = useRef(0);
  const appliedBySync = useRef(false);
  const syncedOnce = useRef(false);

  const sync = useCallback(async () => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    lastStart.current = Date.now();
    try {
      services.current ??= load();
      const { runner, relay, keyStore } = await services.current;
      await withSyncLock(async () => {
        const sent = latest.current.data;
        // Another tab saved other observations: this tab gets them first, with the storage event
        const stored = readStorage(STORAGE_OBSERVATIONS_KEY);
        if (stored !== null && stored !== serializeObservations(sent.observations)) return;
        const result = await runner.runSync({
          relay,
          keyStore,
          storage,
          observations: sent.observations,
          // Until the first saved sync, a key that was missing at the load is still missing
          observationsMissing: sent.loadMissing && !syncedOnce.current,
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
        if (saved) {
          syncedOnce.current = true;
          latest.current.data.markSynced();
        }
      });
    } catch {
      // The key store or the code did not load: the next event loads it again
      services.current = null;
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        void sync();
      }
    }
  }, [load]);

  // The start of the application, the visible page and the online browser
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, sync]);

  // A change of the observations on this device, but not a change from a sync. A change from a
  // sync does not stop the wait of an earlier change.
  const { observations } = data;
  const seen = useRef(observations);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!enabled || seen.current === observations) return;
    seen.current = observations;
    if (appliedBySync.current) {
      appliedBySync.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void sync(), CHANGE_SYNC_DELAY_MS);
  }, [enabled, sync, observations]);
  useEffect(() => () => clearTimeout(timer.current), []);
}
