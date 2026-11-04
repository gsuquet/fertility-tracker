/**
 * One sync with a vault store (ADR 0012). The engine has no network code and no storage code:
 * the vault store reads and writes the content, and the application saves the result.
 */
import type { Observation, ObservationInput } from '../../types/crms';
import { isUserObservation } from '../backupReminder';
import { receiveClock, zeroClock } from './clock';
import type { Clock } from './clock';
import { dayKey, toSyncDay } from './canonical';
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
      /** The dates where the merge changes the day or the manual Peak Day on the device. */
      changedDates: string[];
    };

export type SyncedResult = Extract<SyncResult, { status: 'synced' }>;

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
      changedDates: merged.changedDates,
    };
  }
  return { status: 'busy', state };
}

/** The canonical text of each user day, with its manual Peak Day. */
const keyOfDates = (observations: Observation[]): Map<string, string> =>
  new Map(
    observations
      .filter(isUserObservation)
      .map(o => [o.date, `${dayKey(toSyncDay(o))}|${o.isManualPeak === true}`])
  );

/**
 * Keeps the changes that the user made while the engine waited for the vault store. `sent` is the
 * list that the sync received, and `current` is the list now. Each date that changed between the
 * two keeps its current version. When the merge also changed that date, the merged version goes
 * to the conflicts. The application then saves the observations and the state of the result.
 */
export function keepEditsDuringSync(
  result: SyncedResult,
  sent: Observation[],
  current: Observation[]
): { observations: ObservationInput[]; conflicts: SyncConflict[] } {
  const before = keyOfDates(sent);
  const now = keyOfDates(current);
  const edited = new Set(
    [...new Set([...before.keys(), ...now.keys()])].filter(
      date => before.get(date) !== now.get(date)
    )
  );
  const mergedOf = new Map(result.state.local.map(entry => [entry.date, entry]));
  const conflicts = [...result.conflicts];
  for (const date of result.changedDates.filter(date => edited.has(date))) {
    const merged = mergedOf.get(date) as VaultDay;
    conflicts.push({ date, day: merged.day, clock: merged.clock });
  }
  const observations: ObservationInput[] = [
    ...result.observations.filter(o => !edited.has(o.date as string)),
    ...current.filter(o => isUserObservation(o) && edited.has(o.date)),
  ].sort((a, b) => (a.date as string).localeCompare(b.date as string));
  return { observations, conflicts };
}
