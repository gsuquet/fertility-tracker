import { describe, it, expect } from 'vitest';
import { formatDays, formatMessage, isSingular } from '../format';

describe('formatMessage', () => {
  it('replaces each placeholder with its value', () => {
    expect(formatMessage('Day {day}: {phase}', { day: 3, phase: 'Menses' })).toBe('Day 3: Menses');
  });

  it('replaces a placeholder that occurs more than once', () => {
    expect(formatMessage('{n} of {n}', { n: 2 })).toBe('2 of 2');
  });

  it('keeps a placeholder that has no value', () => {
    expect(formatMessage('Cycle {n} ({date})', { n: 1 })).toBe('Cycle 1 ({date})');
  });

  it('keeps a placeholder named like an inherited object property', () => {
    expect(formatMessage('{toString} {constructor} {n}', { n: 1 })).toBe(
      '{toString} {constructor} 1'
    );
  });
});

describe('formatDays', () => {
  it('writes at most one decimal, in the format of the locale', () => {
    expect(formatDays(28, 'en-US')).toBe('28');
    expect(formatDays(28.5, 'en-US')).toBe('28.5');
    expect(formatDays(28.5, 'fr-FR')).toBe('28,5');
    expect(formatDays(2.96, 'en-US')).toBe('3');
  });
});

describe('isSingular', () => {
  it('follows the plural rules of the locale', () => {
    expect(isSingular(1, 'en-US')).toBe(true);
    expect(isSingular(0, 'en-US')).toBe(false);
    expect(isSingular(1.5, 'en-US')).toBe(false);
    expect(isSingular(1.5, 'fr-FR')).toBe(true);
    expect(isSingular(2, 'fr-FR')).toBe(false);
  });
});
