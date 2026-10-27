import { describe, it, expect } from 'vitest';
import type { ObservationFields } from '../observationForm';
import {
  EMPTY_FIELDS,
  fieldsFromObservation,
  hasFieldChanges,
  needsCycleStartChoice,
} from '../observationForm';
import { makeObservation } from '../../test/factories';

const saved = makeObservation({
  date: '2026-09-02',
  stretch: '10',
  modifiers: ['K', 'L'],
  frequency: 'X3',
  symptoms: ['AP'],
  intercourse: true,
  notes: 'note',
  isManualPeak: true,
  isCycleStart: false,
  codeString: '10KLX3 AP I',
});

describe('fieldsFromObservation', () => {
  it('returns empty fields without an observation', () => {
    expect(fieldsFromObservation(undefined)).toEqual(EMPTY_FIELDS);
  });

  it('copies every field of an observation', () => {
    expect(fieldsFromObservation(saved)).toEqual({
      bleeding: undefined,
      stretch: '10',
      modifiers: ['K', 'L'],
      frequency: 'X3',
      symptoms: ['AP'],
      intercourse: true,
      notes: 'note',
      isManualPeak: true,
      isCycleStart: false,
    });
  });

  it('fills the missing optional fields with defaults', () => {
    expect(fieldsFromObservation(makeObservation({ date: '2026-09-02', bleeding: 'H' }))).toEqual({
      ...EMPTY_FIELDS,
      bleeding: 'H',
    });
  });
});

describe('hasFieldChanges', () => {
  it('finds no change in empty fields for a new day', () => {
    expect(hasFieldChanges(EMPTY_FIELDS, undefined)).toBe(false);
  });

  it.each([
    ['bleeding', { bleeding: 'H' }],
    ['stretch', { stretch: '0' }],
    ['modifiers', { modifiers: ['C'] }],
    ['frequency', { frequency: 'AD' }],
    ['symptoms', { symptoms: ['AP'] }],
    ['intercourse', { intercourse: true }],
    ['notes', { notes: 'x' }],
    ['peak flag', { isManualPeak: true }],
    ['cycle start', { isCycleStart: true }],
  ] satisfies [string, Partial<ObservationFields>][])(
    'finds a new %s on a new day',
    (_name, patch) => {
      expect(hasFieldChanges({ ...EMPTY_FIELDS, ...patch }, undefined)).toBe(true);
    }
  );

  it('ignores blank notes on a new day', () => {
    expect(hasFieldChanges({ ...EMPTY_FIELDS, notes: '   ' }, undefined)).toBe(false);
  });

  it('finds no change in the fields of the saved observation', () => {
    expect(hasFieldChanges(fieldsFromObservation(saved), saved)).toBe(false);
  });

  it('ignores the order of modifiers and symptoms', () => {
    const fields: ObservationFields = {
      ...fieldsFromObservation(saved),
      modifiers: ['L', 'K'],
      symptoms: ['AP'],
    };
    expect(hasFieldChanges(fields, saved)).toBe(false);
  });

  it.each([
    ['bleeding', { bleeding: 'H' }],
    ['stretch', { stretch: '8' }],
    ['modifiers', { modifiers: ['K'] }],
    ['a modifier', { modifiers: ['K', 'C'] }],
    ['frequency', { frequency: 'X1' }],
    ['symptoms', { symptoms: [] }],
    ['a symptom', { symptoms: ['RAP'] }],
    ['intercourse', { intercourse: false }],
    ['notes', { notes: 'other' }],
    ['peak flag', { isManualPeak: false }],
    ['cycle start', { isCycleStart: true }],
  ] satisfies [string, Partial<ObservationFields>][])(
    'finds a changed %s on a saved day',
    (_name, patch) => {
      expect(hasFieldChanges({ ...fieldsFromObservation(saved), ...patch }, saved)).toBe(true);
    }
  );
});

describe('needsCycleStartChoice', () => {
  const history = [makeObservation({ date: '2026-09-01', stretch: '0' })];

  it('asks on the first bleeding day after a dry day', () => {
    expect(needsCycleStartChoice({ ...EMPTY_FIELDS, bleeding: 'H' }, '2026-09-02', history)).toBe(
      true
    );
  });

  it('does not ask when the choice is already made', () => {
    expect(
      needsCycleStartChoice(
        { ...EMPTY_FIELDS, bleeding: 'H', isCycleStart: false },
        '2026-09-02',
        history
      )
    ).toBe(false);
  });

  it('does not ask without bleeding', () => {
    expect(needsCycleStartChoice(EMPTY_FIELDS, '2026-09-02', history)).toBe(false);
  });
});
