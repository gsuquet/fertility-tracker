import { describe, expect, it } from 'vitest';
import type { SyncState } from '../engine';
import {
  parseConflicts,
  parseSyncState,
  serializeConflicts,
  serializeSyncState,
} from '../syncStorage';

const clock = { time: 5, counter: 1, member: 'm' };
const days = [
  { date: '2026-10-02', day: null, clock },
  { date: '2026-10-01', day: { bleeding: 'H' }, clock, peak: { value: true, clock } },
] as SyncState['local'];

describe('sync state text', () => {
  it('writes and reads a state, with and without a base', () => {
    const state: SyncState = { member: 'm', clock, local: days, base: days };
    const read = parseSyncState(serializeSyncState(state));
    expect(read?.local.map(d => d.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect(read?.base).toEqual(read?.local);
    expect(read?.clock).toEqual(clock);
    expect(parseSyncState(serializeSyncState({ ...state, base: null }))?.base).toBeNull();
  });

  it('gives null for a text that is missing or not valid', () => {
    const good = JSON.parse(serializeSyncState({ member: 'm', clock, local: [], base: null }));
    const bad = [
      null,
      'not json',
      '[]',
      'null',
      JSON.stringify({ ...good, member: 7 }),
      JSON.stringify({ ...good, member: 'other' }),
      JSON.stringify({ ...good, clock: { time: -1 } }),
      JSON.stringify({ ...good, local: 'x' }),
      JSON.stringify({ ...good, base: 'x' }),
    ];
    for (const text of bad) expect(parseSyncState(text)).toBeNull();
  });
});

describe('conflict list text', () => {
  it('writes and reads the conflicts, and gives an empty list for a text that is not valid', () => {
    const conflicts = [{ date: '2026-10-01', day: { bleeding: 'H' }, clock }] as never;
    expect(parseConflicts(serializeConflicts(conflicts))).toEqual(conflicts);
    expect(parseConflicts(null)).toEqual([]);
    expect(parseConflicts('{')).toEqual([]);
    expect(parseConflicts('[{"date":"x"}]')).toEqual([]);
  });
});
