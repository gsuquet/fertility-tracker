import {
  FREQUENCY_CODES,
  MENSES_BLEEDING_CODES,
  MODIFIER_CODES,
  STRETCH_CODES,
  SYMPTOM_CODES,
  isCodeIn,
} from '../types/crms';
import type {
  BleedingCode,
  MucusStretch,
  MucusModifier,
  FrequencyCode,
  SymptomCode,
  ObservationInput,
} from '../types/crms';

/** Stretch codes, longest first, so that `10WL` matches before `10`. */
const STRETCH_CODES_LONGEST_FIRST: readonly MucusStretch[] = [...STRETCH_CODES].sort(
  (a, b) => b.length - a.length
);

export interface ParsedCodeResult {
  bleeding?: BleedingCode | undefined;
  stretch?: MucusStretch | undefined;
  modifiers: MucusModifier[];
  frequency?: FrequencyCode | undefined;
  symptoms: SymptomCode[];
  intercourse: boolean;
  formattedCode: string;
}

/**
 * Formats structured observation components into a clean, canonical Creighton code string.
 */
export function formatCodeString(obs: ObservationInput): string {
  const parts: string[] = [];

  // 1. Bleeding
  if (obs.bleeding) {
    parts.push(obs.bleeding);
  }

  // 2. Mucus stretch + Modifiers (e.g. 10KL or 2W or 0)
  let mucusToken = '';
  if (obs.stretch) {
    mucusToken = obs.stretch;
    if (obs.modifiers && obs.modifiers.length > 0) {
      mucusToken += obs.modifiers.join('');
    }
  } else if (obs.modifiers && obs.modifiers.length > 0) {
    mucusToken = obs.modifiers.join('');
  }

  // 3. Frequency (e.g. X1, X2, X3, AD) - concatenated directly to mucus token if present
  if (obs.frequency) {
    if (mucusToken) {
      mucusToken += obs.frequency;
    } else {
      parts.push(obs.frequency);
    }
  }

  if (mucusToken) {
    parts.push(mucusToken);
  }

  // 4. Intercourse marker ('I')
  if (obs.intercourse) {
    parts.push('I');
  }

  return parts.join(' ').trim();
}

/**
 * Softly parses and auto-formats user-entered Creighton code strings.
 */
export function parseCodeString(input: string): ParsedCodeResult {
  const normalized = input.trim().toUpperCase();
  const tokens = normalized.split(/\s+/).filter(Boolean);

  let bleeding: BleedingCode | undefined;
  let stretch: MucusStretch | undefined;
  const modifiers: MucusModifier[] = [];
  let frequency: FrequencyCode | undefined;
  const symptoms: SymptomCode[] = [];
  let intercourse = false;

  for (const token of tokens) {
    if (token === 'I') {
      intercourse = true;
      continue;
    }

    if (isCodeIn(FREQUENCY_CODES, token)) {
      frequency = token;
      continue;
    }

    if (isCodeIn(SYMPTOM_CODES, token)) {
      if (!symptoms.includes(token)) {
        symptoms.push(token);
      }
      continue;
    }

    if (isCodeIn(MENSES_BLEEDING_CODES, token) && !bleeding) {
      bleeding = token;
      continue;
    }

    let remaining = token;

    // Check if token ends with a valid frequency code (e.g. 10KLX3 -> frequency X3, remaining 10KL)
    const matchedFreq = FREQUENCY_CODES.find(f => remaining.endsWith(f));
    if (matchedFreq) {
      frequency = matchedFreq;
      remaining = remaining.slice(0, remaining.length - matchedFreq.length);
    }

    // Check stretch prefix
    const matchedStretch = STRETCH_CODES_LONGEST_FIRST.find(s => remaining.startsWith(s));

    if (matchedStretch) {
      stretch = matchedStretch;
      remaining = remaining.slice(matchedStretch.length);
    }

    // Parse remaining modifiers
    let modIdx = 0;
    while (modIdx < remaining.length) {
      const doubleMod = remaining.slice(modIdx, modIdx + 3); // Check C/K
      if (doubleMod === 'C/K') {
        if (!modifiers.includes('C/K')) modifiers.push('C/K');
        modIdx += 3;
        continue;
      }

      const singleMod = remaining.slice(modIdx, modIdx + 1);
      if (isCodeIn(MODIFIER_CODES, singleMod) && !modifiers.includes(singleMod)) {
        modifiers.push(singleMod);
      }
      modIdx += 1;
    }
  }

  const formattedCode = formatCodeString({
    bleeding,
    stretch,
    modifiers,
    frequency,
    symptoms,
    intercourse,
  });

  return {
    bleeding,
    stretch,
    modifiers,
    frequency,
    symptoms,
    intercourse,
    formattedCode,
  };
}
