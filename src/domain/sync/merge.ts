/**
 * The three-way merge of the sync (ADR 0012): the local days, the base of the last merge and the
 * remote vault, date by date. A day stays one unit: the merge never mixes the fields of two days.
 */
import { sameDay } from './canonical';
import type { SyncDay } from './canonical';
import { compareClocks } from './clock';
import type { Clock } from './clock';
import { cycleOfDates } from './cycles';
import type { PeakState, VaultDay } from './vaultContent';

/** The version of a date that lost a conflict. `day` is null for a deletion that lost. */
export interface SyncConflict {
  date: string;
  day: SyncDay | null;
  clock: Clock;
}

export interface MergeResult {
  days: VaultDay[];
  conflicts: SyncConflict[];
  /** The dates where the merge changes the day or the manual Peak Day on the device. */
  changedDates: string[];
  /** The dates where the merge deletes a day of the device. */
  deletedDates: string[];
}

/** True when the local clock wins. A local clock with time 0 (a first sync) always loses. */
const localWins = (local: Clock, remote: Clock): boolean =>
  local.time !== 0 && compareClocks(local, remote) > 0;

const laterOf = (local?: VaultDay, remote?: VaultDay): VaultDay | undefined => {
  if (!local || !remote) return local ?? remote;
  return localWins(local.clock, remote.clock) ? local : remote;
};

/** The later Peak Day state wins. With two equal clocks, `false` wins. */
const mergePeak = (local?: PeakState, remote?: PeakState): PeakState | undefined => {
  if (!local || !remote) return local ?? remote;
  if (compareClocks(local.clock, remote.clock) === 0) return local.value ? remote : local;
  return localWins(local.clock, remote.clock) ? local : remote;
};

const dayOf = (entry: VaultDay | undefined): SyncDay | null => entry?.day ?? null;
const hasPeak = (entry: VaultDay | undefined): boolean =>
  entry?.day != null && entry.peak?.value === true;

/** A cycle with two or more manual Peak Days keeps the one with the later clock. */
const keepOnePeakInEachCycle = (days: VaultDay[]): void => {
  const live = days.flatMap(entry => (entry.day ? [{ date: entry.date, day: entry.day }] : []));
  const cycleOf = cycleOfDates(live);
  const winners = new Map<string, VaultDay>();
  const peakClock = (entry: VaultDay) => (entry.peak as PeakState).clock;
  for (const entry of days.filter(entry => hasPeak(entry))) {
    const cycle = cycleOf.get(entry.date) as string;
    const winner = winners.get(cycle);
    // The days are sorted by date: with equal clocks, the later date wins
    if (!winner || compareClocks(peakClock(entry), peakClock(winner)) >= 0) {
      winners.set(cycle, entry);
    }
  }
  const kept = new Set(winners.values());
  for (const entry of days) {
    if (hasPeak(entry) && !kept.has(entry)) {
      entry.peak = { value: false, clock: peakClock(entry) };
    }
  }
};

/** Merges the local days and the remote days. `base` is null before the first merge. */
export function mergeDays(
  local: VaultDay[],
  base: VaultDay[] | null,
  remote: VaultDay[]
): MergeResult {
  const localOf = new Map(local.map(entry => [entry.date, entry]));
  const baseOf = new Map((base ?? []).map(entry => [entry.date, entry]));
  const remoteOf = new Map(remote.map(entry => [entry.date, entry]));
  const dates = [...new Set([...localOf.keys(), ...remoteOf.keys()])].sort();
  const conflicts: SyncConflict[] = [];
  const days: VaultDay[] = [];

  for (const date of dates) {
    const l = localOf.get(date);
    const r = remoteOf.get(date);
    const b = dayOf(baseOf.get(date));
    const localChanged = !sameDay(dayOf(l), b);
    const remoteChanged = !sameDay(dayOf(r), b);
    let chosen: VaultDay | undefined;
    if (localChanged && !remoteChanged) {
      chosen = l;
    } else if (remoteChanged && !localChanged) {
      chosen = r;
    } else {
      chosen = laterOf(l, r);
      const loser = chosen === l ? r : l;
      if (localChanged && loser && !sameDay(dayOf(l), dayOf(r))) {
        conflicts.push({ date, day: loser.day, clock: loser.clock });
      }
    }
    const peak = mergePeak(l?.peak, r?.peak);
    // Without a chosen entry, the local side has no entry for a date of the base: the remote has
    const winner = (chosen ?? r) as VaultDay;
    days.push({
      date,
      day: chosen ? chosen.day : null,
      clock: winner.clock,
      ...(peak ? { peak } : {}),
    });
  }

  keepOnePeakInEachCycle(days);

  const changedDates: string[] = [];
  const deletedDates: string[] = [];
  for (const entry of days) {
    const before = localOf.get(entry.date);
    if (!sameDay(dayOf(before), entry.day) || hasPeak(before) !== hasPeak(entry)) {
      changedDates.push(entry.date);
    }
    if (dayOf(before) !== null && entry.day === null) deletedDates.push(entry.date);
  }
  return { days, conflicts, changedDates, deletedDates };
}

/** Adds the conflicts to the list: one conflict for each date, and the new one replaces the old. */
export function addConflicts(list: SyncConflict[], added: SyncConflict[]): SyncConflict[] {
  const byDate = new Map(list.map(conflict => [conflict.date, conflict]));
  for (const conflict of added) byDate.set(conflict.date, conflict);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
