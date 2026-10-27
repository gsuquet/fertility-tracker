import { describe, it, expect } from 'vitest';
import { formatCodeString, parseCodeString } from '../codeParser';
import { STRETCH_CODES } from '../../types/crms';

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

  it('adds the intercourse marker last', () => {
    expect(formatCodeString({ bleeding: 'L', stretch: '2', intercourse: true })).toBe('L 2 I');
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

describe('parseCodeString stretch codes', () => {
  it.each(STRETCH_CODES)('reads stretch %s with the longest match before modifier K', code => {
    const result = parseCodeString(`${code}K`);
    expect(result.stretch).toBe(code);
    expect(result.modifiers).toEqual(['K']);
  });
});
