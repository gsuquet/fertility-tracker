/**
 * Gives a clock to each local change (ADR 0012). The engine compares the observations with the
 * days of the previous comparison, so no write path of the application changes.
 */
import type { Observation } from '../../types/crms';
import { isUserObservation } from '../backupReminder';
import { sameDay, toSyncDay } from './canonical';
import type { SyncDay } from './canonical';
import { nextClock, zeroClock } from './clock';
import type { Clock } from './clock';
import { cycleOfDates } from './cycles';
import type { PeakState, VaultDay } from './vaultContent';

/** The days of the user, one for each date. The demo days never sync. */
const userDays = (observations: Observation[]): Map<string, Observation> =>
  new Map(observations.filter(isUserObservation).map(o => [o.date, o]));

/**
 * Compares the observations with the days of the previous comparison. A changed, new or deleted
 * day gets a new clock. The manual Peak Day of each date has its own comparison.
 */
export function stampLocalChanges(
  observations: Observation[],
  previous: VaultDay[],
  last: Clock,
  now: number
): { days: VaultDay[]; clock: Clock } {
  const current = userDays(observations);
  const before = new Map(previous.map(entry => [entry.date, entry]));
  const dates = [...new Set([...current.keys(), ...before.keys()])].sort();
  let clock = last;
  const tick = () => {
    clock = nextClock(clock, now);
    return clock;
  };

  const days = dates.map(date => {
    const observation = current.get(date);
    const day: SyncDay | null = observation ? toSyncDay(observation) : null;
    const old = before.get(date);
    const entry: VaultDay =
      old && sameDay(old.day, day)
        ? { date, day: old.day, clock: old.clock }
        : { date, day, clock: tick() };
    if (old?.peak) entry.peak = old.peak;
    return entry;
  });

  // A date that loses the Peak Day because a date of the same cycle gains it keeps its clock
  const live = days.flatMap(entry => (entry.day ? [{ date: entry.date, day: entry.day }] : []));
  const cycleOf = cycleOfDates(live);
  const gains = days.filter(
    entry => current.get(entry.date)?.isManualPeak === true && entry.peak?.value !== true
  );
  const gainCycles = new Set(gains.map(entry => cycleOf.get(entry.date)));
  for (const entry of days) {
    const hasPeak = current.get(entry.date)?.isManualPeak === true;
    if (hasPeak === (entry.peak?.value === true)) continue;
    // Here a loss always has an earlier Peak Day state with its clock
    const movedInCycle = !hasPeak && entry.day !== null && gainCycles.has(cycleOf.get(entry.date));
    entry.peak = movedInCycle
      ? { value: false, clock: (entry.peak as PeakState).clock }
      : { value: hasPeak, clock: tick() };
  }
  return { days, clock };
}

/** The days of a first sync: each day and each manual Peak Day gets the zero clock. */
export function firstSyncDays(observations: Observation[], member: string): VaultDay[] {
  const zero = zeroClock(member);
  return [...userDays(observations).values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(observation => ({
      date: observation.date,
      day: toSyncDay(observation),
      clock: zero,
      ...(observation.isManualPeak ? { peak: { value: true, clock: zero } } : {}),
    }));
}
