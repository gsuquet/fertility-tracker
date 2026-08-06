import {
  BleedingCode,
  MucusStretch,
  MucusModifier,
  FrequencyCode,
  SymptomCode,
  Observation
} from '../types/crms';

export interface ParsedCodeResult {
  bleeding?: BleedingCode;
  stretch?: MucusStretch;
  modifiers: MucusModifier[];
  frequency?: FrequencyCode;
  symptoms: SymptomCode[];
  intercourse: boolean;
  formattedCode: string;
}

/**
 * Formats structured observation components into a clean, canonical Creighton code string.
 */
export function formatCodeString(obs: Partial<Observation>): string {
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

  const validBleeding: BleedingCode[] = ['H', 'M', 'L', 'VL'];
  const validStretches: MucusStretch[] = ['10WL', '10SL', '10DL', '2W', '10', '8', '6', '4', '2', '0'];
  const validModifiers: MucusModifier[] = ['C/K', 'B', 'C', 'G', 'K', 'L', 'P', 'Y'];
  const validFreqs: FrequencyCode[] = ['X1', 'X2', 'X3', 'AD'];
  const validSymptoms: SymptomCode[] = ['RAP', 'LAP', 'AP'];

  for (const token of tokens) {
    if (token === 'I') {
      intercourse = true;
      continue;
    }

    if (validFreqs.includes(token as FrequencyCode)) {
      frequency = token as FrequencyCode;
      continue;
    }

    if (validSymptoms.includes(token as SymptomCode)) {
      if (!symptoms.includes(token as SymptomCode)) {
        symptoms.push(token as SymptomCode);
      }
      continue;
    }

    if (validBleeding.includes(token as BleedingCode) && !bleeding) {
      bleeding = token as BleedingCode;
      continue;
    }

    let remaining = token;

    // Check if token ends with a valid frequency code (e.g. 10KLX3 -> frequency X3, remaining 10KL)
    const matchedFreq = validFreqs.find(f => remaining.endsWith(f));
    if (matchedFreq) {
      frequency = matchedFreq;
      remaining = remaining.slice(0, remaining.length - matchedFreq.length);
    }

    // Check stretch prefix
    let matchedStretch = validStretches.find(s => remaining.startsWith(s));

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

      const singleMod = remaining.slice(modIdx, modIdx + 1) as MucusModifier;
      if (validModifiers.includes(singleMod)) {
        if (!modifiers.includes(singleMod)) modifiers.push(singleMod);
      } else if (singleMod === 'B' && !bleeding && !stretch) {
        bleeding = 'B';
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
    intercourse
  });

  return {
    bleeding,
    stretch,
    modifiers,
    frequency,
    symptoms,
    intercourse,
    formattedCode
  };
}
