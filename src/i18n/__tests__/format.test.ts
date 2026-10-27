import { describe, it, expect } from 'vitest';
import { formatMessage } from '../format';

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
