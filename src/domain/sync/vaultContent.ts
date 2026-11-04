/**
 * The content of the vault (ADR 0012): one entry for each date, with the canonical day or a
 * tombstone, its clock and the manual Peak Day with its own clock. The content comes from other
 * devices, so `parseVaultDays()` checks each field.
 */
import {
  BLEEDING_CODES,
  FREQUENCY_CODES,
  MODIFIER_CODES,
  STRETCH_CODES,
  SYMPTOM_CODES,
  isCodeIn,
} from '../../types/crms';
import type { ObservationInput } from '../../types/crms';
import { SYNC_DAY_FIELDS, toSyncDay } from './canonical';
import type { SyncDay } from './canonical';
import type { Clock } from './clock';

/** The manual Peak Day of a date and the clock of its last change. */
export interface PeakState {
  value: boolean;
  clock: Clock;
}

/** One date of the vault. `day` is null for a deleted day (a tombstone). */
export interface VaultDay {
  date: string;
  day: SyncDay | null;
  clock: Clock;
  peak?: PeakState;
}

const MAX_MEMBER_LENGTH = 64;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** A real calendar date in the YYYY-MM-DD form. */
const isDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  DATE_PATTERN.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

const parseClock = (value: unknown): Clock | null => {
  if (!isRecord(value) || !isCount(value.time) || !isCount(value.counter)) return null;
  const { member } = value;
  if (typeof member !== 'string' || member.length === 0 || member.length > MAX_MEMBER_LENGTH) {
    return null;
  }
  return { time: value.time, counter: value.counter, member };
};

const isCodeList = (list: readonly string[], value: unknown): boolean =>
  Array.isArray(value) && value.length > 0 && value.every(item => isCodeIn(list, item));

const FIELD_CHECKS: Record<(typeof SYNC_DAY_FIELDS)[number], (value: unknown) => boolean> = {
  bleeding: value => isCodeIn(BLEEDING_CODES, value),
  stretch: value => isCodeIn(STRETCH_CODES, value),
  modifiers: value => isCodeList(MODIFIER_CODES, value),
  frequency: value => isCodeIn(FREQUENCY_CODES, value),
  symptoms: value => isCodeList(SYMPTOM_CODES, value),
  intercourse: value => value === true,
  notes: value => typeof value === 'string' && value.length > 0,
  isCycleStart: value => typeof value === 'boolean',
};

const isField = (key: string): key is keyof typeof FIELD_CHECKS => Object.hasOwn(FIELD_CHECKS, key);

const parseDay = (value: unknown): SyncDay | null | undefined => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  for (const [key, field] of Object.entries(value)) {
    if (!isField(key) || !FIELD_CHECKS[key](field)) return undefined;
  }
  // The checks above make the record a valid input: this gives its canonical form
  return toSyncDay(value as ObservationInput);
};

const parseEntry = (value: unknown): VaultDay | null => {
  if (!isRecord(value) || !isDate(value.date)) return null;
  const day = parseDay(value.day);
  const clock = parseClock(value.clock);
  if (day === undefined || !clock) return null;
  const entry: VaultDay = { date: value.date, day, clock };
  if (value.peak === undefined) return entry;
  if (!isRecord(value.peak) || typeof value.peak.value !== 'boolean') return null;
  const peakClock = parseClock(value.peak.clock);
  if (!peakClock) return null;
  entry.peak = { value: value.peak.value, clock: peakClock };
  return entry;
};

/** The days of a vault content, sorted by date. Null when one item is not valid. */
export function parseVaultDays(value: unknown): VaultDay[] | null {
  if (!Array.isArray(value)) return null;
  const days: VaultDay[] = [];
  const dates = new Set<string>();
  for (const item of value) {
    const entry = parseEntry(item);
    if (!entry || dates.has(entry.date)) return null;
    dates.add(entry.date);
    days.push(entry);
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

const clockJson = (clock: Clock) => ({
  time: clock.time,
  counter: clock.counter,
  member: clock.member,
});

/** The JSON text of the days, sorted by date with the fields in a fixed sequence. */
export function serializeVaultDays(days: VaultDay[]): string {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return JSON.stringify(
    sorted.map(entry => {
      const { day, peak } = entry;
      const dayJson =
        day === null
          ? null
          : Object.fromEntries(
              SYNC_DAY_FIELDS.filter(field => day[field] !== undefined).map(field => [
                field,
                day[field],
              ])
            );
      return {
        date: entry.date,
        day: dayJson,
        clock: clockJson(entry.clock),
        ...(peak ? { peak: { value: peak.value, clock: clockJson(peak.clock) } } : {}),
      };
    })
  );
}

/** One observation input for each day that is not deleted. */
export function toObservationInputs(days: VaultDay[]): ObservationInput[] {
  return days.flatMap(entry =>
    entry.day === null
      ? []
      : [{ date: entry.date, ...entry.day, ...(entry.peak?.value ? { isManualPeak: true } : {}) }]
  );
}
