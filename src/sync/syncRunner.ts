/** One sync of the application with the vault of the device. See docs/reference/sync-client.md. */
import type { Observation, ObservationInput } from '../types/crms';
import { dropBase, keepEditsDuringSync, newSyncState, syncOnce } from '../domain/sync/engine';
import type { SyncResult } from '../domain/sync/engine';
import { addConflicts } from '../domain/sync/merge';
import {
  parseConflicts,
  parseSyncState,
  serializeConflicts,
  serializeSyncState,
} from '../domain/sync/syncStorage';
import { STORAGE_SYNC_CONFLICTS_KEY, STORAGE_SYNC_STATE_KEY } from '../utils/storageKeys';
import { VaultError, vaultStoreOf } from './deviceVault';
import type { KeyStore } from './keyStore';
import type { RelayClient } from './relayClient';

/** The browser storage, as `readStorage()` and `writeStorage()` give it. */
export interface SyncStorage {
  read(key: string): string | null;
  write(key: string, value: string): boolean;
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

export type RunResult = { status: 'off' } | { status: 'error'; error: VaultError } | SyncResult;

/** One sync for the device record in the key store. It writes nothing to the browser storage. */
export async function runSync(input: RunInput): Promise<RunResult> {
  const { relay, keyStore, storage, observations } = input;
  const record = await keyStore.load();
  if (!record) return { status: 'off' };
  const stored = parseSyncState(storage.read(STORAGE_SYNC_STATE_KEY));
  // A state of another member, for example of an earlier vault, gives a first sync
  const state =
    stored?.member === record.memberId ? stored : newSyncState(record.memberId, observations);
  try {
    return await syncOnce({ ...input, state, store: vaultStoreOf(relay, keyStore, record) });
  } catch (error) {
    if (error instanceof VaultError) return { status: 'error', error };
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
 * then the conflicts. True when the sync result is saved.
 */
export function finishSync(result: RunResult, input: FinishInput): boolean {
  const { storage } = input;
  if (result.status === 'cancelled' || result.status === 'busy') {
    storage.write(STORAGE_SYNC_STATE_KEY, serializeSyncState(result.state));
    return false;
  }
  if (result.status !== 'synced') return false;
  const kept = keepEditsDuringSync(result, input.sent, input.current);
  if (!input.applyObservations(kept.observations, result.changed)) return false;
  storage.write(STORAGE_SYNC_STATE_KEY, serializeSyncState(result.state));
  const conflicts = parseConflicts(storage.read(STORAGE_SYNC_CONFLICTS_KEY));
  storage.write(
    STORAGE_SYNC_CONFLICTS_KEY,
    serializeConflicts(addConflicts(conflicts, kept.conflicts))
  );
  return true;
}

/** Removes the base of the stored state at a load with damaged data: the vault wins at the next sync. */
export function dropBaseAtLoad(storage: SyncStorage, observations: Observation[]): void {
  const state = parseSyncState(storage.read(STORAGE_SYNC_STATE_KEY));
  if (state)
    storage.write(STORAGE_SYNC_STATE_KEY, serializeSyncState(dropBase(state, observations)));
}
