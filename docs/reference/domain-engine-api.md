# Reference: Domain Engine API

This document details the pure calculation functions that compose the core domain engine of **Fertility Tracker** located in [`src/domain/`](../../src/domain).

---

## 1. Code Parser (`codeParser.ts`)

Converts observation form fields into standardized CrMS code strings and vice versa.

### `formatCodeString(obs: Partial<Observation>): string`

Generates standardized short code string (e.g. `"10KL X3 I"`).

* **Parameters:** `obs` - Partial observation object.
* **Returns:** Formatted string.

### `parseCodeString(codeStr: string): Partial<Observation>`

Parses a short code string back into structured observation properties.

---

## 2. Stamp Calculator (`stampCalculator.ts`)

Calculates the CrMS stamp type based on observation biomarkers.

### `calculateStamp(obs: Partial<Observation>, postPeakDayNumber?: number): StampType`

* **Parameters:**
  * `obs`: Observation fields (`bleeding`, `stretch`, `modifiers`).
  * `postPeakDayNumber`: Optional index ($1$, $2$, or $3$) if within post-peak 3-day window.
* **Returns:** `StampType` (`'RED' | 'DARK_GREEN' | 'WHITE_BABY' | 'LIGHT_GREEN_BABY_1' | 'LIGHT_GREEN_BABY_2' | 'LIGHT_GREEN_BABY_3'`).

---

## 3. Peak Detector (`peakDetector.ts`)

Determines Peak Day designation across an ordered sequence of observations in a cycle.

### `detectPeakDay(observations: Observation[], manualPeakDate?: string): { peakIndex: number; peakDate?: string }`

* **Algorithm:**
  1. If `manualPeakDate` is supplied, locates the observation matching `manualPeakDate`.
  2. Otherwise, identifies the last consecutive day of **Peak-type mucus** (stretch $\ge 10$, clear `'K'`, clear mixture `'C/K'`, or lubricative `'L'`).
* **Returns:** Index of the Peak Day and date string.

---

## 4. Cycle Boundary Detector (`cycleBoundaryDetector.ts`)

Identifies cycle boundaries (Day 1 of new cycle triggered by new heavy/moderate bleeding).

### `detectCycleBoundaries(observations: Observation[]): number[]`

* **Returns:** Array of observation indices marking the start of new cycles.
