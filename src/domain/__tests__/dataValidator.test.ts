import { describe, it, expect } from 'vitest';
import {
  validateObservation,
  validateObservationsArray,
  parseAndValidateObservationsJson,
} from '../dataValidator';

describe('dataValidator Domain Engine', () => {
  it('returns null for non-object or invalid date inputs', () => {
    expect(validateObservation(null)).toBeNull();
    expect(validateObservation(undefined)).toBeNull();
    expect(validateObservation('invalid')).toBeNull();
    expect(validateObservation(123)).toBeNull();
    expect(validateObservation({})).toBeNull();
    expect(validateObservation({ date: 'not-a-date' })).toBeNull();
    expect(validateObservation({ date: '2026/09/02' })).toBeNull();
  });

  it('validates and sanitizes a valid raw observation object', () => {
    const raw = {
      date: '2026-09-02',
      bleeding: 'H',
      intercourse: true,
      notes: 'Testing',
    };

    const obs = validateObservation(raw);
    expect(obs).not.toBeNull();
    expect(obs?.date).toBe('2026-09-02');
    expect(obs?.bleeding).toBe('H');
    expect(obs?.intercourse).toBe(true);
    expect(obs?.notes).toBe('Testing');
    expect(obs?.stamp).toBe('RED');
    expect(obs?.codeString).toBe('H I');
  });

  it('sanitizes invalid or unrecognized biomarker codes', () => {
    const raw = {
      date: '2026-09-02',
      bleeding: 'INVALID_FLOW',
      stretch: 'INVALID_STRETCH',
      modifiers: ['K', 'INVALID_MODIFIER', 'L'],
      frequency: 'INVALID_FREQ',
      symptoms: ['AP', 'INVALID_SYM'],
    };

    const obs = validateObservation(raw);
    expect(obs).not.toBeNull();
    expect(obs?.bleeding).toBeUndefined();
    expect(obs?.stretch).toBeUndefined();
    expect(obs?.modifiers).toEqual(['K', 'L']);
    expect(obs?.frequency).toBeUndefined();
    expect(obs?.symptoms).toEqual(['AP']);
  });

  it('validates and deduplicates arrays of observations', () => {
    const rawList = [
      { date: '2026-09-01', bleeding: 'M' },
      { date: '2026-09-02', bleeding: 'L' },
      { date: '2026-09-01', bleeding: 'H' }, // Duplicate date, replaces prior
      { invalid: true }, // Invalid, filtered out
      null,
    ];

    const result = validateObservationsArray(rawList);
    expect(result.length).toBe(2);
    expect(result[0].date).toBe('2026-09-01');
    expect(result[0].bleeding).toBe('H');
    expect(result[1].date).toBe('2026-09-02');
  });

  it('parses and validates JSON strings safely', () => {
    const validJson = JSON.stringify([{ date: '2026-09-02', bleeding: 'M' }]);
    expect(parseAndValidateObservationsJson(validJson)).toHaveLength(1);

    expect(parseAndValidateObservationsJson('corrupt json string')).toBeNull();
    expect(parseAndValidateObservationsJson('{"notAnArray": true}')).toBeNull();
    expect(parseAndValidateObservationsJson('')).toBeNull();
  });
});
