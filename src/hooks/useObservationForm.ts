import { useCallback, useState } from 'react';
import type {
  BleedingCode,
  FrequencyCode,
  MucusModifier,
  MucusStretch,
  Observation,
  ObservationInput,
  SymptomCode,
} from '../types/crms';
import { formatCodeString, parseCodeString } from '../domain/codeParser';
import { calculateStamp } from '../domain/stampCalculator';
import type { ObservationFields } from '../domain/observationForm';
import { EMPTY_FIELDS, fieldsFromObservation } from '../domain/observationForm';

const toggle = <T>(items: T[], item: T) =>
  items.includes(item) ? items.filter(i => i !== item) : [...items, item];

/**
 * Holds the state of an observation form. A change to a code field rewrites the
 * direct code text. A typed direct code updates the code fields.
 */
export function useObservationForm() {
  const [fields, setFields] = useState<ObservationFields>(EMPTY_FIELDS);
  const [directInputText, setDirectInputText] = useState('');

  const load = useCallback((obs: Observation | undefined) => {
    setFields(fieldsFromObservation(obs));
    setDirectInputText(obs?.codeString ?? '');
  }, []);

  const updateCode = (patch: Partial<ObservationFields>) => {
    const next = { ...fields, ...patch };
    setFields(next);
    setDirectInputText(formatCodeString(next));
  };

  const update = (patch: Partial<ObservationFields>) => setFields(prev => ({ ...prev, ...patch }));

  const setDirectText = (text: string) => {
    setDirectInputText(text);
    setFields(prev => ({ ...prev, ...parseCodeString(text) }));
  };

  const currentCode = formatCodeString(fields);

  return {
    fields,
    directInputText,
    currentCode,
    calculatedStamp: calculateStamp(fields.bleeding, fields.stretch, fields.modifiers),
    load,
    setDirectText,
    selectBleeding: (bleeding?: BleedingCode) => updateCode({ bleeding }),
    selectStretch: (stretch?: MucusStretch) => updateCode({ stretch }),
    selectFrequency: (frequency?: FrequencyCode) => updateCode({ frequency }),
    toggleModifier: (mod: MucusModifier) =>
      updateCode({ modifiers: toggle(fields.modifiers, mod) }),
    toggleSymptom: (sym: SymptomCode) => updateCode({ symptoms: toggle(fields.symptoms, sym) }),
    toggleIntercourse: () => updateCode({ intercourse: !fields.intercourse }),
    setNotes: (notes: string) => update({ notes }),
    toggleManualPeak: () => update({ isManualPeak: !fields.isManualPeak }),
    toggleCycleStart: () => update({ isCycleStart: fields.isCycleStart !== true }),
    setCycleStart: (isCycleStart: boolean) => update({ isCycleStart }),
    /** Builds the payload to save, with the cycle start choice made for this save. */
    toInput: (
      date: string,
      id: string | undefined,
      isCycleStart: boolean | undefined
    ): ObservationInput => ({
      ...fields,
      id,
      date,
      isCycleStart,
      codeString: currentCode,
    }),
  };
}
