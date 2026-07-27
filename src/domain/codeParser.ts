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
  if (obs.stretch) {
    let mucusToken = obs.stretch;
    if (obs.modifiers && obs.modifiers.length > 0) {
      mucusToken += obs.modifiers.join('');
    }
    parts.push(mucusToken);
  } else if (obs.modifiers && obs.modifiers.length > 0) {
    parts.push(obs.modifiers.join(''));
  }

  // 3. Frequency (e.g. X1, X2, X3, AD)
  if (obs.frequency) {
    parts.push(obs.frequency);
  }

  // 4. Symptoms (e.g. AP, RAP, LAP)
  if (obs.symptoms && obs.symptoms.length > 0) {
    parts.push(...obs.symptoms);
  }

  // 5. Intercourse marker ('I')
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

    // Check stretch prefix
    let matchedStretch = validStretches.find(s => token.startsWith(s));
    let remaining = token;

    if (matchedStretch) {
      stretch = matchedStretch;
      remaining = token.slice(matchedStretch.length);
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
