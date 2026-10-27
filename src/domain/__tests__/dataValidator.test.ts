import { describe, it, expect } from 'vitest';
import { validateObservation } from '../dataValidator';

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

  it('keeps a valid boolean isCycleStart and a positive cycleDay', () => {
    const result = validateObservation({
      date: '2026-09-01',
      isCycleStart: false,
      cycleDay: 4,
      notes: 'note',
    });
    expect(result).toMatchObject({ isCycleStart: false, cycleDay: 4, notes: 'note' });
  });

  it('keeps every valid field of a complete record', () => {
    const raw = {
      id: 'obs_custom',
      date: '2026-09-03',
      stretch: '10',
      modifiers: ['K', 'X', 'L'],
      frequency: 'X3',
      symptoms: ['AP', 'NOPE'],
      codeString: '10KLX3 custom',
    };
    expect(validateObservation(raw)).toMatchObject({
      id: 'obs_custom',
      stretch: '10',
      modifiers: ['K', 'L'],
      frequency: 'X3',
      symptoms: ['AP'],
      codeString: '10KLX3 custom',
      stamp: 'WHITE_BABY',
    });
  });

  it('replaces a blank id and a blank code string', () => {
    const result = validateObservation({
      id: '  ',
      date: '2026-09-04',
      stretch: '0',
      codeString: ' ',
    });
    expect(result?.id).toMatch(/^obs_2026-09-04_\d+$/);
    expect(result?.codeString).toBe('0');
  });
});
