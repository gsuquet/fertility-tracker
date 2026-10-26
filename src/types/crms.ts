export type BleedingCode = 'H' | 'M' | 'L' | 'VL' | 'B';

export type MucusStretch = '0' | '2' | '2W' | '4' | '6' | '8' | '10' | '10DL' | '10SL' | '10WL';

export type MucusModifier = 'B' | 'C' | 'C/K' | 'G' | 'K' | 'L' | 'P' | 'Y';

export type FrequencyCode = 'X1' | 'X2' | 'X3' | 'AD';

export type SymptomCode = 'AP' | 'RAP' | 'LAP';

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
