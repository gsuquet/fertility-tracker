import { describe, expect, it } from 'vitest';
import type { SyncDay } from '../canonical';
import { addConflicts, mergeDays } from '../merge';
import type { SyncConflict } from '../merge';
import type { VaultDay } from '../vaultContent';

const c = (time: number, member = 'phone', counter = 0) => ({ time, counter, member });
const day = (
  date: string,
  value: SyncDay | null,
  clock = c(1),
  peak?: VaultDay['peak']
): VaultDay => (peak ? { date, day: value, clock, peak } : { date, day: value, clock });
const D = '2026-10-05';

describe('mergeDays', () => {
  it('keeps the side that changed, and the later clock when nothing changed', () => {
    const base = [day(D, { stretch: '0' }, c(1))];
    expect(
      mergeDays([day(D, { stretch: '0' }, c(1))], base, [day(D, { stretch: '0' }, c(1))])
    ).toEqual({
      days: [day(D, { stretch: '0' }, c(1))],
      conflicts: [],
      changedDates: [],
      deletedDates: [],
    });
    expect(
      mergeDays([day(D, { stretch: '2' }, c(5))], base, [day(D, { stretch: '0' }, c(1))]).days
    ).toEqual([day(D, { stretch: '2' }, c(5))]);
    const remote = mergeDays([day(D, { stretch: '0' }, c(1))], base, [
      day(D, { stretch: '4' }, c(3, 'tablet')),
    ]);
    expect(remote.days).toEqual([day(D, { stretch: '4' }, c(3, 'tablet'))]);
    expect(remote.changedDates).toEqual([D]);
  });

  it('applies a remote deletion and a local deletion, and counts the deleted days', () => {
    const base = [day(D, { stretch: '0' }, c(1))];
    const remoteDeleted = mergeDays(base, base, [day(D, null, c(4, 'tablet'))]);
    expect(remoteDeleted.days).toEqual([day(D, null, c(4, 'tablet'))]);
    expect(remoteDeleted.deletedDates).toEqual([D]);
    const localDeleted = mergeDays([day(D, null, c(4))], base, base);
    expect(localDeleted.days).toEqual([day(D, null, c(4))]);
    expect(localDeleted.deletedDates).toEqual([]);
  });

  it('gives no conflict when both sides made the same change', () => {
    const result = mergeDays(
      [day(D, { stretch: '6' }, c(4))],
      [day(D, { stretch: '0' }, c(1))],
      [day(D, { stretch: '6' }, c(5, 'tablet'))]
    );
    expect(result.days).toEqual([day(D, { stretch: '6' }, c(5, 'tablet'))]);
    expect(result.conflicts).toEqual([]);
  });

  it('keeps the later clock in a conflict and puts the other version in the conflicts', () => {
    const base = [day(D, { stretch: '0' }, c(1))];
    const localWins = mergeDays([day(D, { stretch: '6' }, c(9))], base, [
      day(D, null, c(5, 'tablet')),
    ]);
    expect(localWins.days).toEqual([day(D, { stretch: '6' }, c(9))]);
    expect(localWins.conflicts).toEqual([{ date: D, day: null, clock: c(5, 'tablet') }]);

    const remoteWins = mergeDays([day(D, { stretch: '6' }, c(5))], base, [
      day(D, { stretch: '8' }, c(9, 'tablet')),
    ]);
    expect(remoteWins.days).toEqual([day(D, { stretch: '8' }, c(9, 'tablet'))]);
    expect(remoteWins.conflicts).toEqual([{ date: D, day: { stretch: '6' }, clock: c(5) }]);
  });

  it('lets the vault win a first sync, also over a zero clock of a different member', () => {
    const result = mergeDays([day(D, { stretch: '6' }, c(0, 'zz'))], null, [
      day(D, { stretch: '8' }, c(0, 'aa')),
    ]);
    expect(result.days).toEqual([day(D, { stretch: '8' }, c(0, 'aa'))]);
    expect(result.conflicts).toEqual([{ date: D, day: { stretch: '6' }, clock: c(0, 'zz') }]);
    // A local date that the vault does not have goes into the vault
    const added = mergeDays([day('2026-10-06', { stretch: '0' }, c(0))], null, [
      day(D, { stretch: '8' }, c(2, 'aa')),
    ]);
    expect(added.days.map(d => d.date)).toEqual([D, '2026-10-06']);
  });

  it('handles a date of the base that the local days do not have', () => {
    const base = [day(D, { stretch: '0' }, c(1))];
    // Only the local side changed: the date has no day
    expect(mergeDays([], base, base).days).toEqual([day(D, null, c(1))]);
    // Both sides changed: the remote day stays, with no conflict for the missing local entry
    const both = mergeDays([], base, [day(D, { stretch: '2' }, c(3, 'tablet'))]);
    expect(both.days).toEqual([day(D, { stretch: '2' }, c(3, 'tablet'))]);
    expect(both.conflicts).toEqual([]);
  });

  it('merges the manual Peak Day by its own clock, and false wins a tie', () => {
    const v = { stretch: '10' } as const;
    const merge = (local: VaultDay['peak'], remote: VaultDay['peak']) =>
      mergeDays([day(D, v, c(1), local)], [day(D, v, c(1))], [day(D, v, c(1), remote)]).days[0]
        ?.peak;
    expect(merge({ value: true, clock: c(5) }, { value: false, clock: c(3, 'tablet') })).toEqual({
      value: true,
      clock: c(5),
    });
    expect(merge({ value: true, clock: c(2) }, { value: false, clock: c(3, 'tablet') })).toEqual({
      value: false,
      clock: c(3, 'tablet'),
    });
    expect(merge({ value: true, clock: c(3) }, { value: false, clock: c(3) })).toEqual({
      value: false,
      clock: c(3),
    });
    expect(merge({ value: false, clock: c(3) }, { value: true, clock: c(3) })).toEqual({
      value: false,
      clock: c(3),
    });
    expect(merge({ value: true, clock: c(0) }, { value: false, clock: c(0, 'a') })).toEqual({
      value: false,
      clock: c(0, 'a'),
    });
    expect(merge(undefined, { value: true, clock: c(3) })).toEqual({ value: true, clock: c(3) });
    expect(merge({ value: true, clock: c(3) }, undefined)).toEqual({ value: true, clock: c(3) });
    expect(merge(undefined, undefined)).toBeUndefined();
  });

  it('reports a Peak Day change as a change on the device', () => {
    const v = { stretch: '10' } as const;
    const result = mergeDays(
      [day(D, v, c(1))],
      [day(D, v, c(1))],
      [day(D, v, c(1), { value: true, clock: c(4, 'tablet') })]
    );
    expect(result.changedDates).toEqual([D]);
  });

  it('keeps one manual Peak Day in each cycle: the later clock, then the later date', () => {
    const local = [
      day('2026-10-01', { bleeding: 'H' }),
      day('2026-10-10', { stretch: '10' }, c(1), { value: true, clock: c(5) }),
      day('2026-10-12', { stretch: '10' }),
      day('2026-11-01', { bleeding: 'H' }),
      day('2026-11-10', { stretch: '10' }, c(1), { value: true, clock: c(2) }),
      day('2026-11-12', { stretch: '10' }),
    ];
    const remote = [
      ...local.slice(0, 2).map(d => ({ ...d })),
      day('2026-10-12', { stretch: '10' }, c(1), { value: true, clock: c(7, 'tablet') }),
      local[3] as VaultDay,
      local[4] as VaultDay,
      day('2026-11-12', { stretch: '10' }, c(1), { value: true, clock: c(2) }),
    ];
    const { days } = mergeDays(local, local, remote);
    expect(days.map(d => [d.date, d.peak?.value ?? null])).toEqual([
      ['2026-10-01', null],
      ['2026-10-10', false],
      ['2026-10-12', true],
      ['2026-11-01', null],
      ['2026-11-10', false],
      ['2026-11-12', true],
    ]);
    // The date that lost keeps its clock
    expect(days[1]?.peak).toEqual({ value: false, clock: c(5) });
  });

  it('keeps an earlier date when its Peak Day clock is later', () => {
    const local = [
      day('2026-10-10', { stretch: '10' }, c(1), { value: true, clock: c(8) }),
      day('2026-10-11', { stretch: '10' }, c(1), { value: true, clock: c(2) }),
    ];
    const { days } = mergeDays(local, local, local);
    expect(days.map(d => d.peak?.value)).toEqual([true, false]);
  });

  it('ignores the Peak Day of a deleted day in the cycle rule', () => {
    const local = [
      day('2026-10-10', null, c(3), { value: true, clock: c(9) }),
      day('2026-10-11', { stretch: '10' }, c(1), { value: true, clock: c(2) }),
    ];
    const { days } = mergeDays(local, local, local);
    expect(days[1]?.peak).toEqual({ value: true, clock: c(2) });
  });
});

describe('addConflicts', () => {
  it('keeps one conflict for each date, the new one, sorted by date', () => {
    const old: SyncConflict[] = [
      { date: '2026-10-05', day: { stretch: '0' }, clock: c(1) },
      { date: '2026-10-01', day: null, clock: c(1) },
    ];
    expect(addConflicts(old, [{ date: '2026-10-05', day: { stretch: '2' }, clock: c(2) }])).toEqual(
      [
        { date: '2026-10-01', day: null, clock: c(1) },
        { date: '2026-10-05', day: { stretch: '2' }, clock: c(2) },
      ]
    );
  });
});
