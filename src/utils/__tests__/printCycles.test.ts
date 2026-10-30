import { describe, expect, it } from 'vitest';
import { makeObservation } from '../../test/factories';
import type { Cycle } from '../../types/crms';
import {
  cycleLength,
  printCode,
  printRows,
  printStartDate,
  selectPrintCycles,
  shortDate,
} from '../printCycles';

const cycle = (id: string, startDate: string, days = 1): Cycle => ({
  id,
  startDate,
  observations: Array.from({ length: days }, (_, i) =>
    makeObservation({
      date: `${startDate.slice(0, 8)}${String(Number(startDate.slice(8)) + i).padStart(2, '0')}`,
      cycleDay: i + 1,
    })
  ),
});

// Newest first, as in the app
const cycles = [cycle('c3', '2026-09-21'), cycle('c2', '2026-09-11'), cycle('c1', '2026-09-01')];

describe('selectPrintCycles', () => {
  it('numbers the cycles from the oldest and sorts them from the oldest', () => {
    expect(
      selectPrintCycles(cycles, ['all'], '2026-10-01').map(c => [c.cycle.id, c.number])
    ).toEqual([
      ['c1', 1],
      ['c2', 2],
      ['c3', 3],
    ]);
  });

  it('keeps all the cycles for an empty selection', () => {
    expect(selectPrintCycles(cycles, [], '2026-10-01')).toHaveLength(3);
  });

  it('keeps only the selected cycles, with their numbers', () => {
    expect(selectPrintCycles(cycles, ['c3', 'c1'], '2026-10-01').map(c => c.number)).toEqual([
      1, 3,
    ]);
  });

  it('gives one empty cycle that starts today when there are no cycles', () => {
    expect(selectPrintCycles([], ['all'], '2026-10-01')).toEqual([
      { cycle: { id: 'cycle_empty', startDate: '2026-10-01', observations: [] }, number: 1 },
    ]);
  });
});

describe('printRows', () => {
  it('gives one row of 35 days, with the dates of the empty days', () => {
    const rows = printRows(cycle('c', '2026-09-01', 2));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(35);
    expect(rows[0]?.[1]?.obs?.cycleDay).toBe(2);
    expect(rows[0]?.[34]).toEqual({ dayNum: 35, obs: undefined, date: '2026-10-05' });
  });

  it('adds a row for a cycle longer than 35 days', () => {
    const long: Cycle = {
      id: 'c',
      startDate: '2026-09-01',
      observations: [makeObservation({ date: '2026-10-06', cycleDay: 36 })],
    };
    const rows = printRows(long);
    expect(rows.map(r => r.length)).toEqual([35, 35]);
    expect(rows[1]?.[0]?.obs?.cycleDay).toBe(36);
  });

  it('starts an empty cycle on its start date', () => {
    const rows = printRows({ id: 'e', startDate: '2026-10-01', observations: [] });
    expect(rows[0]?.[0]).toEqual({ dayNum: 1, obs: undefined, date: '2026-10-01' });
  });
});

describe('printStartDate and printCode', () => {
  it('uses the first observation, or the start date of an empty cycle', () => {
    expect(printStartDate(cycle('c', '2026-09-03'))).toBe('2026-09-03');
    expect(printStartDate({ id: 'e', startDate: '2026-10-01', observations: [] })).toBe(
      '2026-10-01'
    );
  });

  it('removes the spaces and the AP, RAP and LAP marks', () => {
    expect(printCode('10KL AD AP')).toBe('10KLAD');
    expect(printCode('6C X1 RAP LAP')).toBe('6CX1');
  });
});

describe('cycleLength and shortDate', () => {
  it('gives the cycle day of the last observation, also with missing days', () => {
    const gap: Cycle = {
      id: 'g',
      startDate: '2026-09-01',
      observations: [
        makeObservation({ date: '2026-09-01', cycleDay: 1 }),
        makeObservation({ date: '2026-09-05', cycleDay: 5 }),
      ],
    };
    expect(cycleLength(gap)).toBe(5);
    expect(cycleLength({ id: 'e', startDate: '2026-10-01', observations: [] })).toBe(0);
  });

  it('writes the short date in the language', () => {
    expect(shortDate('2026-09-30', 'en-US')).toBe('Sep 30');
    expect(shortDate('2026-09-30', 'fr-FR')).toBe('30 sept.');
  });
});
