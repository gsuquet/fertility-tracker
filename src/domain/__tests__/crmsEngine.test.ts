import { describe, it, expect } from 'vitest';
import { calculateStamp, isPeakTypeMucus } from '../stampCalculator';
import { processCycleObservations } from '../peakDetector';
import { formatCodeString, parseCodeString } from '../codeParser';
import { Observation } from '../../types/crms';

describe('Creighton Model Domain Engine', () => {
  describe('stampCalculator', () => {
    it('calculates RED stamp for heavy menses', () => {
      expect(calculateStamp('H')).toBe('RED');
      expect(calculateStamp('M')).toBe('RED');
      expect(calculateStamp('L')).toBe('RED');
      expect(calculateStamp('VL')).toBe('RED');
    });

    it('identifies peak type mucus characteristics correctly', () => {
      expect(isPeakTypeMucus('10', ['K'])).toBe(true);
      expect(isPeakTypeMucus('0', [])).toBe(false);
      expect(isPeakTypeMucus(undefined, ['L'])).toBe(true);
    });

    it('calculates DARK_GREEN stamp for dry days', () => {
      expect(calculateStamp(undefined, '0')).toBe('DARK_GREEN');
      expect(calculateStamp(undefined, '2')).toBe('DARK_GREEN');
      expect(calculateStamp(undefined, '2W')).toBe('DARK_GREEN');
      expect(calculateStamp(undefined, '4')).toBe('DARK_GREEN');
    });

    it('calculates WHITE_BABY stamp for fertile mucus', () => {
      expect(calculateStamp(undefined, '6')).toBe('WHITE_BABY');
      expect(calculateStamp(undefined, '8')).toBe('WHITE_BABY');
      expect(calculateStamp(undefined, '10')).toBe('WHITE_BABY');
      expect(calculateStamp(undefined, '10DL')).toBe('WHITE_BABY');
      expect(calculateStamp(undefined, '0', ['K'])).toBe('WHITE_BABY');
      expect(calculateStamp(undefined, '0', ['L'])).toBe('WHITE_BABY');
      expect(calculateStamp(undefined, '4', ['C/K'])).toBe('WHITE_BABY');
    });
  });

  describe('codeParser & formatter', () => {
    it('formats structured observation into canonical code string without whitespace between mucus and frequency', () => {
      const code = formatCodeString({
        stretch: '10',
        modifiers: ['K', 'L'],
        frequency: 'X3',
        intercourse: true,
      });
      expect(code).toBe('10KLX3 I');
    });

    it('parses direct text input with space between mucus and frequency and auto-formats without space', () => {
      const parsed = parseCodeString('10kl x3 i ap');
      expect(parsed.stretch).toBe('10');
      expect(parsed.modifiers).toEqual(['K', 'L']);
      expect(parsed.frequency).toBe('X3');
      expect(parsed.intercourse).toBe(true);
      expect(parsed.symptoms).toEqual(['AP']);
      expect(parsed.formattedCode).toBe('10KLX3 I');
    });

    it('parses direct text input without space between mucus and frequency', () => {
      const parsed = parseCodeString('10klx3 i ap');
      expect(parsed.stretch).toBe('10');
      expect(parsed.modifiers).toEqual(['K', 'L']);
      expect(parsed.frequency).toBe('X3');
      expect(parsed.intercourse).toBe(true);
      expect(parsed.symptoms).toEqual(['AP']);
      expect(parsed.formattedCode).toBe('10KLX3 I');
    });

    it('parses 0AD and 2WX2 with or without whitespace', () => {
      const parsed1 = parseCodeString('0 ad');
      expect(parsed1.stretch).toBe('0');
      expect(parsed1.frequency).toBe('AD');
      expect(parsed1.formattedCode).toBe('0AD');

      const parsed2 = parseCodeString('2wx2');
      expect(parsed2.stretch).toBe('2W');
      expect(parsed2.frequency).toBe('X2');
      expect(parsed2.formattedCode).toBe('2WX2');
    });

    it('parses bleeding codes cleanly', () => {
      const parsed = parseCodeString('h i');
      expect(parsed.bleeding).toBe('H');
      expect(parsed.intercourse).toBe(true);
      expect(parsed.formattedCode).toBe('H I');
    });
  });

  describe('peakDetector', () => {
    it('detects peak day and applies 1, 2, 3 post-peak count stamps', () => {
      const rawObs: Observation[] = [
        { id: '1', date: '2026-07-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
        {
          id: '2',
          date: '2026-07-02',
          cycleDay: 2,
          stretch: '0',
          stamp: 'DARK_GREEN',
          codeString: '0',
        },
        {
          id: '3',
          date: '2026-07-03',
          cycleDay: 3,
          stretch: '10',
          modifiers: ['K'],
          stamp: 'WHITE_BABY',
          codeString: '10K',
        }, // Peak Day!
        {
          id: '4',
          date: '2026-07-04',
          cycleDay: 4,
          stretch: '0',
          stamp: 'DARK_GREEN',
          codeString: '0',
        }, // Post Peak 1
        {
          id: '5',
          date: '2026-07-05',
          cycleDay: 5,
          stretch: '0',
          stamp: 'DARK_GREEN',
          codeString: '0',
        }, // Post Peak 2
        {
          id: '6',
          date: '2026-07-06',
          cycleDay: 6,
          stretch: '0',
          stamp: 'DARK_GREEN',
          codeString: '0',
        }, // Post Peak 3
        {
          id: '7',
          date: '2026-07-07',
          cycleDay: 7,
          stretch: '0',
          stamp: 'DARK_GREEN',
          codeString: '0',
        }, // Infertile dry
      ];

      const processed = processCycleObservations(rawObs);

      expect(processed[2].isPeakDay).toBe(true);
      expect(processed[2].stamp).toBe('WHITE_BABY');
      expect(processed[3].stamp).toBe('LIGHT_GREEN_BABY_1');
      expect(processed[4].stamp).toBe('LIGHT_GREEN_BABY_2');
      expect(processed[5].stamp).toBe('LIGHT_GREEN_BABY_3');
      expect(processed[6].stamp).toBe('DARK_GREEN');
    });

    it('sorts observations created out of date order chronologically by date and calculates cycleDay', () => {
      const rawObs: Observation[] = [
        {
          id: '2',
          date: '2026-07-25',
          cycleDay: 1,
          stretch: '0',
          stamp: 'DARK_GREEN',
          codeString: '0',
        },
        { id: '1', date: '2026-07-20', cycleDay: 2, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      ];

      const processed = processCycleObservations(rawObs);

      expect(processed[0].date).toBe('2026-07-20');
      expect(processed[0].cycleDay).toBe(1);
      expect(processed[1].date).toBe('2026-07-25');
      expect(processed[1].cycleDay).toBe(6);
    });
  });
});
