/**
 * The text of the sync state and of the conflict list in the browser storage. The text can be
 * old or changed, so each parse checks all the fields.
 */
import type { SyncState } from './engine';
import type { SyncConflict } from './merge';
import { parseClock, parseVaultDays, serializeVaultDays } from './vaultContent';

const parseJson = (text: string | null): unknown => {
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const daysJson = (days: SyncState['local']) => JSON.parse(serializeVaultDays(days)) as unknown;

/** The JSON text of a sync state. */
export function serializeSyncState(state: SyncState): string {
  return JSON.stringify({
    member: state.member,
    clock: { time: state.clock.time, counter: state.clock.counter, member: state.clock.member },
    local: daysJson(state.local),
    base: state.base === null ? null : daysJson(state.base),
  });
}

/** The sync state of a text, or null when the text is missing or one field is not valid. */
export function parseSyncState(text: string | null): SyncState | null {
  const value = parseJson(text);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { member, clock, local, base } = value as Record<string, unknown>;
  const parsedClock = parseClock(clock);
  const parsedLocal = parseVaultDays(local);
  const parsedBase = base === null ? null : parseVaultDays(base);
  if (typeof member !== 'string' || !parsedClock || parsedClock.member !== member) return null;
  if (!parsedLocal || (parsedBase === null && base !== null)) return null;
  return { member, clock: parsedClock, local: parsedLocal, base: parsedBase };
}

/** The JSON text of a conflict list. Each conflict has its own date. */
export const serializeConflicts = (conflicts: SyncConflict[]): string =>
  serializeVaultDays(conflicts);

/** The conflicts of a text. An empty list when the text is missing or not valid. */
export function parseConflicts(text: string | null): SyncConflict[] {
  return (parseVaultDays(parseJson(text)) ?? []).map(({ date, day, clock }) => ({
    date,
    day,
    clock,
  }));
}
