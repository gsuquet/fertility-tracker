/** The single source of each CrMS code list. The code types derive from these arrays. */
export const BLEEDING_CODES = ['H', 'M', 'L', 'VL', 'B'] as const;
export type BleedingCode = (typeof BLEEDING_CODES)[number];

/** Menses bleeding: the bleeding codes without brown (B). */
export const MENSES_BLEEDING_CODES = [
  'H',
  'M',
  'L',
  'VL',
] as const satisfies readonly BleedingCode[];

export const STRETCH_CODES = ['0', '2', '2W', '4', '6', '8', '10', '10DL', '10SL', '10WL'] as const;
export type MucusStretch = (typeof STRETCH_CODES)[number];

/** Stretch codes of Peak-type mucus. */
export const PEAK_TYPE_STRETCH_CODES = [
  '6',
  '8',
  '10',
  '10DL',
  '10SL',
  '10WL',
] as const satisfies readonly MucusStretch[];

export const MODIFIER_CODES = ['B', 'C', 'C/K', 'G', 'K', 'L', 'P', 'Y'] as const;
export type MucusModifier = (typeof MODIFIER_CODES)[number];

/** Modifiers of Peak-type mucus: clear, lubricative and cloudy/clear. */
export const PEAK_TYPE_MODIFIERS = ['K', 'L', 'C/K'] as const satisfies readonly MucusModifier[];

export const FREQUENCY_CODES = ['X1', 'X2', 'X3', 'AD'] as const;
export type FrequencyCode = (typeof FREQUENCY_CODES)[number];

export const SYMPTOM_CODES = ['AP', 'RAP', 'LAP'] as const;
export type SymptomCode = (typeof SYMPTOM_CODES)[number];

/** Type-safe membership test for the readonly code lists. */
export const isCodeIn = <T extends string>(list: readonly T[], value: unknown): value is T =>
  (list as readonly unknown[]).includes(value);

export type StampType =
  | 'RED' // Bleeding menses
  | 'DARK_GREEN' // Normal infertile dry day
  | 'WHITE_BABY' // Fertile mucus day
  | 'LIGHT_GREEN_BABY_1' // Post-peak day 1
  | 'LIGHT_GREEN_BABY_2' // Post-peak day 2
  | 'LIGHT_GREEN_BABY_3' // Post-peak day 3
  | 'YELLOW'; // Continuous mucus / yellow stamp regime

export interface Observation {
  id: string;
  date: string; // YYYY-MM-DD
  cycleDay: number; // 1, 2, 3...
  bleeding?: BleedingCode | undefined;
  stretch?: MucusStretch | undefined;
  modifiers?: MucusModifier[] | undefined;
  frequency?: FrequencyCode | undefined;
  symptoms?: SymptomCode[] | undefined;
  intercourse?: boolean | undefined; // 'I' marker
  notes?: string | undefined;
  isManualPeak?: boolean | undefined; // Manual Peak override
  isCycleStart?: boolean | undefined; // Explicitly designated cycle start boundary flag
  stamp: StampType;
  codeString: string; // Formatted code e.g. "10KLX3 I"
  isPeakDay?: boolean | undefined; // Automatically or manually designated Peak Day 'P'
}

/** Partial observation payload accepted by save and format helpers. */
export type ObservationInput = { [K in keyof Observation]?: Observation[K] | undefined };

export interface Cycle {
  id: string;
  startDate: string; // YYYY-MM-DD
  observations: Observation[];
  manualPeakDate?: string | undefined; // YYYY-MM-DD override
  notes?: string | undefined;
}

export type Language = 'en' | 'fr';

export type Theme = 'dark' | 'light';

export type ActiveTab = 'today' | 'chart' | 'calendar' | 'analytics';
