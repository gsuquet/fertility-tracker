import type { Cycle, Observation } from '../types/crms';
import { addDays } from './dateUtils';

/** The days of one row of the paper chart */
export const PRINT_ROW_DAYS = 35;

/** A cycle of the print or the PNG, with its number: Cycle 1 is the oldest */
export interface PrintCycle {
  cycle: Cycle;
  number: number;
}

/** One day slot of the 35-day grid. A slot without an observation has only its day and date. */
export interface PrintSlot {
  dayNum: number;
  obs: Observation | undefined;
  date: string;
}

/**
 * The cycles that the print and the PNG show, from the oldest to the newest. `cycles` is newest
 * first, as in the app. `ids` holds the selected cycle ids, or 'all'. Without cycles, there is one
 * empty cycle that starts on `today`.
 */
export function selectPrintCycles(cycles: Cycle[], ids: string[], today: string): PrintCycle[] {
  const all =
    cycles.length > 0 ? cycles : [{ id: 'cycle_empty', startDate: today, observations: [] }];
  const numbered = all.map((cycle, index) => ({ cycle, number: all.length - index }));
  const selected =
    ids.includes('all') || ids.length === 0
      ? numbered
      : numbered.filter(({ cycle }) => ids.includes(cycle.id));
  // ISO dates sort as text
  return selected.sort((a, b) => a.cycle.startDate.localeCompare(b.cycle.startDate));
}

/** The first date of a cycle in the print */
export const printStartDate = (cycle: Cycle) => cycle.observations[0]?.date ?? cycle.startDate;

/**
 * The day slots of a cycle, in rows of 35 days. A cycle has at least one row, and as many rows as
 * its last observation needs.
 */
export function printRows(cycle: Cycle): PrintSlot[][] {
  const byDay = new Map(cycle.observations.map(o => [o.cycleDay, o]));
  const maxDay = Math.max(0, ...cycle.observations.map(o => o.cycleDay));
  const total = Math.max(PRINT_ROW_DAYS, Math.ceil(maxDay / PRINT_ROW_DAYS) * PRINT_ROW_DAYS);
  const start = printStartDate(cycle);
  const slots = Array.from({ length: total }, (_, i) => {
    const obs = byDay.get(i + 1);
    return { dayNum: i + 1, obs, date: obs?.date ?? addDays(start, i) };
  });
  const rows: PrintSlot[][] = [];
  for (let i = 0; i < slots.length; i += PRINT_ROW_DAYS) {
    rows.push(slots.slice(i, i + PRINT_ROW_DAYS));
  }
  return rows;
}

/** The code of a print cell: no spaces, and no AP, RAP or LAP, which the cell shows apart */
export const printCode = (codeString: string) =>
  codeString.replace(/\b(AP|RAP|LAP)\b/g, '').replace(/\s+/g, '');
