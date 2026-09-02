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
  bleeding?: BleedingCode;
  stretch?: MucusStretch;
  modifiers?: MucusModifier[];
  frequency?: FrequencyCode;
  symptoms?: SymptomCode[];
  intercourse?: boolean; // 'I' marker
  notes?: string;
  isManualPeak?: boolean; // Manual Peak override
  isCycleStart?: boolean; // Explicitly designated cycle start boundary flag
  stamp: StampType;
  codeString: string; // Formatted code e.g. "10KLX3 I"
  isPeakDay?: boolean; // Automatically or manually designated Peak Day 'P'
}

export interface Cycle {
  id: string;
  startDate: string; // YYYY-MM-DD
  observations: Observation[];
  manualPeakDate?: string; // YYYY-MM-DD override
  notes?: string;
}

export type Language = 'en' | 'fr';

export type Theme = 'dark' | 'light';

export type ActiveTab = 'today' | 'chart' | 'calendar' | 'analytics';
