/** One sync of the application with the vault of the device. See docs/reference/sync-client.md. */
import type { Observation, ObservationInput } from '../types/crms';
import { keepEditsDuringSync, newSyncState, syncOnce } from '../domain/sync/engine';
import type { SyncResult, SyncState } from '../domain/sync/engine';
import { stampLocalChanges } from '../domain/sync/localChanges';
import { addConflicts } from '../domain/sync/merge';
import {
  parseConflicts,
  parseSyncState,
  serializeConflicts,
  serializeSyncState,
} from '../domain/sync/syncStorage';
import { serializeVaultDays } from '../domain/sync/vaultContent';
import {
  STORAGE_SHARED_CHART_KEY,
  STORAGE_SHARED_READ_KEY,
  STORAGE_SYNC_CONFLICTS_KEY,
  STORAGE_SYNC_STATE_KEY,
} from '../utils/storageKeys';
import { VaultError, openSession, vaultStoreOf } from './deviceVault';
import { getTodayStr } from '../utils/dateUtils';
import type { DeviceRecord, KeyStore } from './keyStore';
import type { RelayClient } from './relayClient';

/** The browser storage, as `readStorage()` and `writeStorage()` give it. */
export interface SyncStorage {
  read(key: string): string | null;
  write(key: string, value: string): boolean;
  remove(key: string): void;
}

export interface RunInput {
  relay: RelayClient;
  keyStore: KeyStore;
  storage: SyncStorage;
  observations: Observation[];
  observationsMissing: boolean;
  recoveryData: boolean;
  saveFailed: boolean;
  now: number;
  confirmDeletions: (dates: string[]) => Promise<boolean>;
}

export type RunResult =
  | { status: 'off' }
  | { status: 'error'; error: VaultError; state: SyncState }
  | SyncResult;

/** One sync for the device record in the key store. It writes nothing to the browser storage. */
export async function runSync(input: RunInput): Promise<RunResult> {
  const { relay, keyStore, storage, observations } = input;
  const record = await keyStore.load();
  if (!record) return { status: 'off' };
  const stored = parseSyncState(storage.read(STORAGE_SYNC_STATE_KEY));
  // A state of another member, for example of an earlier vault, gives a first sync
  const first =
    stored?.member === record.memberId ? stored : newSyncState(record.memberId, observations);
  // The clocks of the local changes stay also when the relay fails, for example offline
  const stamped = stampLocalChanges(observations, first.local, first.clock, input.now);
  const state = { ...first, local: stamped.days, clock: stamped.clock };
  try {
    return await syncOnce({ ...input, state, store: vaultStoreOf(relay, keyStore, record) });
  } catch (error) {
    if (error instanceof VaultError) return { status: 'error', error, state };
    throw error;
  }
}

export interface FinishInput {
  storage: SyncStorage;
  /** The observations that the sync received. */
  sent: Observation[];
  /** The observations now. */
  current: Observation[];
  /** Saves the observations. False when the browser refused the write. */
  applyObservations: (observations: ObservationInput[], changed: boolean) => boolean;
}

/**
 * Saves the result of a sync in the sequence of the sync rules: the observations, then the state,
 * then the conflicts. True when each write succeeds.
 */
export function finishSync(result: RunResult, input: FinishInput): boolean {
  const { storage } = input;
  if (result.status === 'cancelled' || result.status === 'busy' || result.status === 'error') {
    storage.write(STORAGE_SYNC_STATE_KEY, serializeSyncState(result.state));
    return false;
  }
  if (result.status !== 'synced') return false;
  const kept = keepEditsDuringSync(result, input.sent, input.current);
  if (!input.applyObservations(kept.observations, result.changed)) return false;
  if (!storage.write(STORAGE_SYNC_STATE_KEY, serializeSyncState(result.state))) {
    // An old state would make the days of the vault look like local changes: a first sync is safe
    storage.remove(STORAGE_SYNC_STATE_KEY);
    return false;
  }
  const conflicts = parseConflicts(storage.read(STORAGE_SYNC_CONFLICTS_KEY));
  return storage.write(
    STORAGE_SYNC_CONFLICTS_KEY,
    serializeConflicts(addConflicts(conflicts, kept.conflicts))
  );
}

/**
 * The sync of a reader device: it reads the vault and writes its days to the shared chart. It
 * never merges them with the observations of the device. After a failure, the shared chart stays.
 */
export async function readShared(
  relay: RelayClient,
  keyStore: KeyStore,
  record: DeviceRecord,
  storage: SyncStorage
): Promise<{ saved: boolean; error: VaultError | null }> {
  try {
    const session = await openSession(relay, keyStore, record);
    // The own observations go nowhere: the read is not a sync, and the backup reminder stays
    const saved =
      storage.write(STORAGE_SHARED_CHART_KEY, serializeVaultDays(session.days)) &&
      storage.write(STORAGE_SHARED_READ_KEY, getTodayStr());
    return { saved, error: null };
  } catch (error) {
    if (error instanceof VaultError) return { saved: false, error };
    throw error;
  }
}
