import { describe, it, expect } from 'vitest';
import { appendMissingSymptoms, formatCodeString, parseCodeString } from '../codeParser';
import type { ObservationInput } from '../../types/crms';

describe('formatCodeString', () => {
  it('returns an empty string when no field is set', () => {
    expect(formatCodeString({})).toBe('');
  });

  it('writes modifiers without a stretch as the mucus token', () => {
    expect(formatCodeString({ modifiers: ['C', 'K'], frequency: 'X1' })).toBe('CKX1');
  });

  it('writes the frequency as its own token when there is no mucus token', () => {
    expect(formatCodeString({ bleeding: 'M', frequency: 'AD' })).toBe('M AD');
  });

  it('ignores an empty modifier list', () => {
    expect(formatCodeString({ stretch: '0', modifiers: [] })).toBe('0');
  });

  it('adds the intercourse marker after the mucus token', () => {
    expect(formatCodeString({ bleeding: 'L', stretch: '2', intercourse: true })).toBe('L 2 I');
  });

  it('adds the symptom codes last', () => {
    expect(
      formatCodeString({
        stretch: '10',
        modifiers: ['K', 'L'],
        frequency: 'X3',
        intercourse: true,
        symptoms: ['AP'],
      })
    ).toBe('10KLX3 I AP');
    expect(formatCodeString({ symptoms: ['RAP', 'LAP'] })).toBe('RAP LAP');
  });
});

describe('code string round trip', () => {
  const cases: ObservationInput[] = [
    { stretch: '10', modifiers: ['K', 'L'], frequency: 'X3', intercourse: true, symptoms: ['AP'] },
    { bleeding: 'M', frequency: 'AD', symptoms: ['RAP', 'LAP'] },
    { stretch: '0', frequency: 'AD', symptoms: ['LAP'] },
    { symptoms: ['AP'] },
  ];

  it.each(cases)('keeps every field of %o', obs => {
    const parsed = parseCodeString(formatCodeString(obs));
    expect(parsed).toMatchObject({
      bleeding: obs.bleeding,
      stretch: obs.stretch,
      modifiers: obs.modifiers ?? [],
      frequency: obs.frequency,
      symptoms: obs.symptoms ?? [],
      intercourse: obs.intercourse ?? false,
    });
    expect(parsed.formattedCode).toBe(formatCodeString(obs));
  });

  it('shows the symptom of the direct code 10KLX3 I AP', () => {
    expect(parseCodeString('10klx3 i ap').formattedCode).toBe('10KLX3 I AP');
  });
});

describe('appendMissingSymptoms', () => {
  it('appends each symptom that the stored code does not show', () => {
    expect(appendMissingSymptoms('10KLX3 I', ['AP'])).toBe('10KLX3 I AP');
    expect(appendMissingSymptoms('0AD RAP', ['RAP', 'LAP'])).toBe('0AD RAP LAP');
  });

  it('keeps a code that already shows all the symptoms', () => {
    expect(appendMissingSymptoms('10KLX3 I AP', ['AP'])).toBe('10KLX3 I AP');
    expect(appendMissingSymptoms('0AD', [])).toBe('0AD');
  });

  it('does not match a symptom code inside another token', () => {
    expect(appendMissingSymptoms('0 RAP', ['AP'])).toBe('0 RAP AP');
  });
});

describe('parseCodeString', () => {
  it('returns an empty result for blank input', () => {
    expect(parseCodeString('   ')).toEqual({
      bleeding: undefined,
      stretch: undefined,
      modifiers: [],
      frequency: undefined,
      symptoms: [],
      intercourse: false,
      formattedCode: '',
    });
  });

  it('records each symptom code once', () => {
    expect(parseCodeString('0AD RAP RAP LAP').symptoms).toEqual(['RAP', 'LAP']);
  });

  it('keeps the first bleeding code and parses a later one as a modifier token', () => {
    const result = parseCodeString('H L');
    expect(result.bleeding).toBe('H');
    expect(result.modifiers).toEqual(['L']);
  });

  it('parses modifiers when the token has no stretch prefix', () => {
    const result = parseCodeString('KLX2');
    expect(result.stretch).toBeUndefined();
    expect(result.modifiers).toEqual(['K', 'L']);
    expect(result.frequency).toBe('X2');
  });

  it('parses the C/K modifier once', () => {
    const result = parseCodeString('6C/KC/K');
    expect(result.stretch).toBe('6');
    expect(result.modifiers).toEqual(['C/K']);
    expect(result.formattedCode).toBe('6C/K');
  });

  it('ignores duplicate and unknown modifier characters', () => {
    const result = parseCodeString('10KKZQ');
    expect(result.modifiers).toEqual(['K']);
    expect(result.formattedCode).toBe('10K');
  });

  it('parses lowercase input and the intercourse marker', () => {
    const result = parseCodeString('vl 2wx1 i');
    expect(result.bleeding).toBe('VL');
    expect(result.stretch).toBe('2W');
    expect(result.frequency).toBe('X1');
    expect(result.intercourse).toBe(true);
    expect(result.formattedCode).toBe('VL 2WX1 I');
  });
});
