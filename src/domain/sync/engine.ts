/**
 * One sync with a vault store (ADR 0012). The engine has no network code and no storage code:
 * the vault store reads and writes the content, and the application saves the result.
 */
import type { Observation, ObservationInput } from '../../types/crms';
import { receiveClock, zeroClock } from './clock';
import type { Clock } from './clock';
import { firstSyncDays, stampLocalChanges } from './localChanges';
import { mergeDays } from './merge';
import type { SyncConflict } from './merge';
import { serializeVaultDays, toObservationInputs } from './vaultContent';
import type { VaultDay } from './vaultContent';

/** More deleted days than this need the confirmation of the user. */
export const MAX_DELETIONS_WITHOUT_CONFIRMATION = 7;

/** The reads and writes of one sync after a changed vault (`412`). */
export const MAX_SYNC_ATTEMPTS = 5;

export interface SyncState {
  member: string;
  /** The last clock that the device gave or received. */
  clock: Clock;
  /** The days of the last comparison with the observations. */
  local: VaultDay[];
  /** The vault days of the last merge. Null before the first merge. */
  base: VaultDay[] | null;
}

export interface VaultStore {
  /** The vault days and their ETag, or null when the vault has no content. */
  read(): Promise<{ days: VaultDay[]; etag: string } | null>;
  /** The new ETag, or null when the vault changed after the read (`412`). */
  write(days: VaultDay[], etag: string | null): Promise<string | null>;
}

export interface SyncInput {
  state: SyncState;
  observations: Observation[];
  store: VaultStore;
  now: number;
  recoveryData: boolean;
  saveFailed: boolean;
  /** The observations key is missing from the browser storage. */
  observationsMissing: boolean;
  confirmDeletions: (dates: string[]) => Promise<boolean>;
}

export type SyncResult =
  | { status: 'skipped'; reason: 'recoveryData' | 'saveFailed' }
  | { status: 'cancelled' | 'busy'; state: SyncState }
  | {
      status: 'synced';
      state: SyncState;
      observations: ObservationInput[];
      conflicts: SyncConflict[];
      changed: boolean;
    };

/** The state of a device that joins a vault: its days get the zero clock, so the vault wins. */
export function newSyncState(member: string, observations: Observation[]): SyncState {
  return {
    member,
    clock: zeroClock(member),
    local: firstSyncDays(observations, member),
    base: null,
  };
}

/** Removes the base. The next sync is a first sync, and the vault wins on each date. */
export function dropBase(state: SyncState, observations: Observation[]): SyncState {
  return { ...state, base: null, local: firstSyncDays(observations, state.member) };
}

/**
 * Stamps the local changes, merges them with the vault and writes the result. The application
 * saves the observations of a `synced` result first, then the new state.
 */
export async function syncOnce(input: SyncInput): Promise<SyncResult> {
  if (input.recoveryData) return { status: 'skipped', reason: 'recoveryData' };
  if (input.saveFailed) return { status: 'skipped', reason: 'saveFailed' };
  const { store } = input;
  let state = input.state;
  // Without the observations key, the device reads the vault as a new device: it deletes no day
  if (input.observationsMissing) state = { ...state, local: [], base: null };
  const stamped = stampLocalChanges(
    input.observationsMissing ? [] : input.observations,
    state.local,
    state.clock,
    input.now
  );
  state = { ...state, local: stamped.days, clock: stamped.clock };

  for (let attempt = 0; attempt < MAX_SYNC_ATTEMPTS; attempt++) {
    const remote = await store.read();
    const remoteDays = remote?.days ?? [];
    const merged = mergeDays(state.local, state.base, remoteDays);
    if (
      merged.deletedDates.length > MAX_DELETIONS_WITHOUT_CONFIRMATION &&
      !(await input.confirmDeletions(merged.deletedDates))
    ) {
      return { status: 'cancelled', state };
    }
    if (serializeVaultDays(merged.days) !== serializeVaultDays(remoteDays)) {
      const etag = await store.write(merged.days, remote?.etag ?? null);
      if (etag === null) continue;
    }
    const clock = receiveClock(
      state.clock,
      merged.days.flatMap(entry => [entry.clock, entry.peak?.clock])
    );
    return {
      status: 'synced',
      state: { member: state.member, clock, local: merged.days, base: merged.days },
      observations: toObservationInputs(merged.days),
      conflicts: merged.conflicts,
      changed: merged.changedDates.length > 0,
    };
  }
  return { status: 'busy', state };
}
