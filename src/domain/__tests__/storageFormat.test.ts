import { describe, it, expect } from 'vitest';
import {
  STORAGE_SCHEMA_VERSION,
  parseObservationData,
  serializeObservations,
} from '../storageFormat';
import { makeObservation } from '../../test/factories';

const legacyObservation = {
  id: 'obs_2026-06-02',
  date: '2026-06-02',
  cycleDay: 9,
  stretch: '10',
  modifiers: ['K', 'L'],
  frequency: 'X3',
  symptoms: [],
  intercourse: true,
  notes: 'kept',
  isManualPeak: true,
  isCycleStart: false,
  stamp: 'WHITE_BABY',
  codeString: '10KLX3 I',
  isPeakDay: true,
};

describe('storageFormat', () => {
  it('writes the observations in a versioned envelope', () => {
    const obs = makeObservation({ date: '2026-06-01' });
    expect(JSON.parse(serializeObservations([obs]))).toEqual({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      observations: [obs],
    });
    expect(STORAGE_SCHEMA_VERSION).toBe(1);
  });

  it('indents the envelope when an indent is given', () => {
    expect(serializeObservations([], 2)).toBe('{\n  "schemaVersion": 1,\n  "observations": []\n}');
  });

  it('migrates the bare array of version 0 without loss', () => {
    const result = parseObservationData(JSON.stringify([legacyObservation]));
    expect(result).toEqual({
      observations: [
        {
          id: 'obs_2026-06-02',
          date: '2026-06-02',
          cycleDay: 9,
          bleeding: undefined,
          stretch: '10',
          modifiers: ['K', 'L'],
          frequency: 'X3',
          symptoms: [],
          intercourse: true,
          notes: 'kept',
          isManualPeak: true,
          isCycleStart: false,
          stamp: 'WHITE_BABY',
          codeString: '10KLX3 I',
        },
      ],
      droppedCount: 0,
    });
  });

  it('reads back what it writes', () => {
    const migrated = parseObservationData(JSON.stringify([legacyObservation]));
    const written = serializeObservations(migrated?.observations ?? []);
    expect(parseObservationData(written)).toEqual(migrated);
  });

  it('reads an empty bare array and an empty envelope', () => {
    expect(parseObservationData('[]')).toEqual({ observations: [], droppedCount: 0 });
    expect(parseObservationData('{"schemaVersion":1,"observations":[]}')).toEqual({
      observations: [],
      droppedCount: 0,
    });
  });

  it('calculates the code string again from the fields', () => {
    const stale = { ...legacyObservation, codeString: 'H 0' };
    const blank = { ...legacyObservation, date: '2026-06-03', codeString: '' };
    const result = parseObservationData(
      JSON.stringify({ schemaVersion: 1, observations: [stale, blank] })
    );
    expect(result?.observations.map(o => o.codeString)).toEqual(['10KLX3 I', '10KLX3 I']);
  });

  it('counts the records that it drops, but not the duplicate dates', () => {
    const result = parseObservationData(
      JSON.stringify([
        { date: '2026-06-01', stretch: '0' },
        { date: 'not-a-date' },
        null,
        'text',
        { date: '2026-06-01', stretch: '10' },
      ])
    );
    expect(result?.droppedCount).toBe(3);
    expect(result?.observations).toHaveLength(1);
    expect(result?.observations[0]?.stretch).toBe('10');
  });

  it('sorts the observations by date', () => {
    const result = parseObservationData(
      JSON.stringify([{ date: '2026-06-03' }, { date: '2026-06-01' }])
    );
    expect(result?.observations.map(o => o.date)).toEqual(['2026-06-01', '2026-06-03']);
  });

  it.each([
    ['text that is not JSON', '{corrupt'],
    ['an empty text', ''],
    ['a single object', '{"date":"2026-06-01"}'],
    ['a number', '42'],
    ['null', 'null'],
    ['a newer schema version', '{"schemaVersion":2,"observations":[]}'],
    ['schema version 0 in an envelope', '{"schemaVersion":0,"observations":[]}'],
    ['a schema version that is not an integer', '{"schemaVersion":1.5,"observations":[]}'],
    ['a schema version that is text', '{"schemaVersion":"1","observations":[]}'],
    ['an envelope without observations', '{"schemaVersion":1}'],
    ['an envelope with an object as observations', '{"schemaVersion":1,"observations":{}}'],
  ])('cannot read %s', (_label, text) => {
    expect(parseObservationData(text)).toBeNull();
  });
});
