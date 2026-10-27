import type {
  BleedingCode,
  FrequencyCode,
  MucusModifier,
  MucusStretch,
  Observation,
  SymptomCode,
} from '../types/crms';
import { calculateStamp } from './stampCalculator';
import { formatCodeString } from './codeParser';
import { addDays } from '../utils/dateUtils';

/**
 * Builds 56 days of demo observations ending on `todayStr`: two complete 28-day
 * cycles with a Peak Day on cycle day 13 each.
 */
export function buildDemoObservations(todayStr: string): Observation[] {
  const demoObs: Observation[] = [];

  // Generate 2 full 28-day past cycles + current cycle (56 days total history)
  for (let i = 55; i >= 0; i--) {
    const dateStr = addDays(todayStr, -i);
    const cd = ((55 - i) % 28) + 1;

    let bleeding: BleedingCode | undefined;
    let stretch: MucusStretch | undefined;
    let modifiers: MucusModifier[] = [];
    let frequency: FrequencyCode | undefined;
    let intercourse = false;
    let symptoms: SymptomCode[] = [];

    if (cd <= 3) {
      bleeding = cd === 1 ? 'H' : cd === 2 ? 'M' : 'L';
    } else if (cd === 4) {
      bleeding = 'VL';
    } else if (cd >= 5 && cd <= 8) {
      stretch = '0';
      frequency = 'AD';
    } else if (cd === 9 || cd === 10) {
      stretch = '2';
      modifiers = ['C'];
      frequency = 'X2';
    } else if (cd === 11) {
      stretch = '6';
      modifiers = ['C/K'];
      frequency = 'X3';
      intercourse = true;
    } else if (cd === 12) {
      stretch = '8';
      modifiers = ['K'];
      frequency = 'X3';
    } else if (cd === 13) {
      // PEAK DAY!
      stretch = '10';
      modifiers = ['K', 'L'];
      frequency = 'AD';
      symptoms = ['AP'];
    } else if (cd >= 14 && cd <= 16) {
      stretch = '0';
      frequency = 'AD';
      if (cd === 15) intercourse = true;
    } else {
      stretch = '0';
      frequency = 'AD';
      if (cd === 21) intercourse = true;
    }

    const stamp = calculateStamp(bleeding, stretch, modifiers);
    const codeString = formatCodeString({
      bleeding,
      stretch,
      modifiers,
      frequency,
      symptoms,
      intercourse,
    });

    demoObs.push({
      id: `demo_${dateStr}`,
      date: dateStr,
      cycleDay: cd,
      bleeding,
      stretch,
      modifiers,
      frequency,
      symptoms,
      intercourse,
      stamp,
      codeString,
    });
  }

  return demoObs;
}
