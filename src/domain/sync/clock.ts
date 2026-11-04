/**
 * Hybrid logical clocks (ADR 0012): the time in milliseconds, a counter and the member id. A
 * later clock wins a conflict. The counter orders two changes in the same millisecond.
 */

export interface Clock {
  time: number;
  counter: number;
  member: string;
}

/** The clock of a day of a first sync: it loses to each clock of the vault. */
export const zeroClock = (member: string): Clock => ({ time: 0, counter: 0, member });

/** Negative when `a` is earlier, positive when `a` is later. A missing clock is the lowest. */
export function compareClocks(a: Clock | undefined, b: Clock | undefined): number {
  if (!a || !b) return (a ? 1 : 0) - (b ? 1 : 0);
  if (a.time !== b.time) return a.time - b.time;
  if (a.counter !== b.counter) return a.counter - b.counter;
  if (a.member === b.member) return 0;
  return a.member < b.member ? -1 : 1;
}

/** A clock later than `last`, with a time of at least `now`. */
export function nextClock(last: Clock, now: number): Clock {
  if (now > last.time) return { time: now, counter: 0, member: last.member };
  return { time: last.time, counter: last.counter + 1, member: last.member };
}

/** The latest of `last` and the other clocks, with the member of `last`. */
export function receiveClock(last: Clock, clocks: Iterable<Clock | undefined>): Clock {
  let latest = last;
  for (const clock of clocks) {
    if (clock && compareClocks(clock, latest) > 0) latest = clock;
  }
  return { time: latest.time, counter: latest.counter, member: last.member };
}
