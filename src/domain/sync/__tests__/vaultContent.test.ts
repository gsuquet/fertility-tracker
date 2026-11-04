import { describe, expect, it } from 'vitest';
import { parseVaultDays, serializeVaultDays, toObservationInputs } from '../vaultContent';
import type { VaultDay } from '../vaultContent';

const clock = { time: 5, counter: 1, member: 'phone' };
const valid = {
  date: '2026-10-02',
  day: { stretch: '10', modifiers: ['L', 'K'], notes: 'n', intercourse: true, isCycleStart: false },
  clock,
  peak: { value: true, clock },
};

describe('parseVaultDays', () => {
  it('reads valid days, sorted by date, in their canonical form', () => {
    const days = parseVaultDays([valid, { date: '2026-10-01', day: null, clock }]);
    expect(days).toEqual([
      { date: '2026-10-01', day: null, clock },
      {
        date: '2026-10-02',
        day: {
          stretch: '10',
          modifiers: ['K', 'L'],
          notes: 'n',
          intercourse: true,
          isCycleStart: false,
        },
        clock,
        peak: { value: true, clock },
      },
    ]);
    expect(parseVaultDays([])).toEqual([]);
    expect(
      parseVaultDays([
        {
          date: '2026-10-03',
          day: { bleeding: 'H', frequency: 'AD', symptoms: ['AP'] },
          clock: { time: 0, counter: 0, member: 'x'.repeat(64) },
        },
      ])
    ).toHaveLength(1);
  });

  it('gives null when one item is not valid', () => {
    const invalid: unknown[] = [
      'text',
      [null],
      [valid, valid],
      [{ ...valid, date: '2026-02-30' }],
      [{ ...valid, date: '2026-1-01' }],
      [{ ...valid, date: 20261001 }],
      [{ ...valid, day: 'day' }],
      [{ ...valid, day: [] }],
      [{ ...valid, day: { stretch: '11' } }],
      [{ ...valid, day: { bleeding: 'X' } }],
      [{ ...valid, day: { frequency: 'X9' } }],
      [{ ...valid, day: { modifiers: [] } }],
      [{ ...valid, day: { modifiers: ['Z'] } }],
      [{ ...valid, day: { symptoms: 'AP' } }],
      [{ ...valid, day: { intercourse: false } }],
      [{ ...valid, day: { notes: '' } }],
      [{ ...valid, day: { isCycleStart: 'yes' } }],
      [{ ...valid, day: { isManualPeak: true } }],
      [{ ...valid, clock: null }],
      [{ ...valid, clock: { ...clock, time: -1 } }],
      [{ ...valid, clock: { ...clock, counter: 1.5 } }],
      [{ ...valid, clock: { ...clock, member: '' } }],
      [{ ...valid, clock: { ...clock, member: 'x'.repeat(65) } }],
      [{ ...valid, clock: { ...clock, member: 7 } }],
      [{ ...valid, peak: null }],
      [{ ...valid, peak: { value: 'yes', clock } }],
      [{ ...valid, peak: { value: true } }],
    ];
    for (const value of invalid) expect(parseVaultDays(value)).toBeNull();
  });
});

describe('serializeVaultDays', () => {
  it('gives the same text for the same content in a different order', () => {
    const a: VaultDay[] = [
      { date: '2026-10-02', day: { stretch: '0', bleeding: 'B' }, clock },
      { date: '2026-10-01', day: null, clock, peak: { value: false, clock } },
    ];
    const b: VaultDay[] = [
      {
        date: '2026-10-01',
        day: null,
        peak: { clock: { member: 'phone', counter: 1, time: 5 }, value: false },
        clock,
      },
      { date: '2026-10-02', clock, day: { bleeding: 'B', stretch: '0' } },
    ];
    expect(serializeVaultDays(a)).toBe(serializeVaultDays(b));
    expect(parseVaultDays(JSON.parse(serializeVaultDays(a)))).toEqual(parseVaultDays(b));
  });
});

describe('toObservationInputs', () => {
  it('gives the days that are not deleted, with the manual Peak Day', () => {
    expect(
      toObservationInputs([
        { date: '2026-10-01', day: null, clock, peak: { value: true, clock } },
        { date: '2026-10-02', day: { stretch: '10' }, clock, peak: { value: true, clock } },
        { date: '2026-10-03', day: { stretch: '0' }, clock, peak: { value: false, clock } },
      ])
    ).toEqual([
      { date: '2026-10-02', stretch: '10', isManualPeak: true },
      { date: '2026-10-03', stretch: '0' },
    ]);
  });
});
