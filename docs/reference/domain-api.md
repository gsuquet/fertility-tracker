# Domain API

This page lists the exported functions of `src/domain/`. These functions are pure: they do not use React and they do not change their arguments. The exception is `versionTracker.ts`, which reads and writes `localStorage`.

## codeParser.ts

| Function           | Signature                             | Returns                                                                       |
| ------------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| `formatCodeString` | `(obs: ObservationInput) => string`   | The code string, for example `"10KLX3 I"`. It does not include symptoms.      |
| `parseCodeString`  | `(input: string) => ParsedCodeResult` | The fields of a typed code, and `formattedCode`. Unknown letters are ignored. |

`ParsedCodeResult` has `bleeding`, `stretch`, `modifiers`, `frequency`, `symptoms`, `intercourse` and `formattedCode`.

## stampCalculator.ts

| Function          | Signature                                                                                     | Returns                                           |
| ----------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `isPeakTypeMucus` | `(stretch?: MucusStretch, modifiers?: MucusModifier[]) => boolean`                            | `true` if the mucus is fertile.                   |
| `calculateStamp`  | `(bleeding?: BleedingCode, stretch?: MucusStretch, modifiers?: MucusModifier[]) => StampType` | The stamp of one day, without the count of three. |

## mucusScore.ts

| Function        | Signature                                                      | Returns                                                                        |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `getMucusScore` | `(obs: Pick<Observation, 'stretch' \| 'modifiers'>) => number` | The mucus score of one day, from 0 to 10. `K` or `L` gives 10. `C/K` does not. |

The rules are in [Cycle and phase rules](cycle-and-phase-rules.md#mucus-score).

## peakDetector.ts

| Function                   | Signature                                                                 | Returns                                                                        |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `processCycleObservations` | `(observations: Observation[], manualPeakDate?: string) => Observation[]` | The days of one cycle in date order, with `cycleDay`, `stamp` and `isPeakDay`. |

The rules are in [Stamp and Peak Day rules](stamp-and-peak-rules.md).

## cycleBoundaryDetector.ts

| Function                      | Signature                                                                                   | Returns                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `groupObservationsIntoCycles` | `(observations: Observation[]) => Cycle[]`                                                  | The cycles, newest first. Each cycle goes through `processCycleObservations`. |
| `isFirstBleedingDayOfSeries`  | `(obsData: { date: string; bleeding?: string }, allObservations: Observation[]) => boolean` | `true` if the day has bleeding and the previous observation has none.         |
| `getCycleEndDate`             | `(cycle: Cycle) => string`                                                                  | The date of the last observation, or the start date of an empty cycle.        |

The rules are in [Cycle and phase rules](cycle-and-phase-rules.md).

## cyclePhases.ts

| Function         | Signature                            | Returns                                                                       |
| ---------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| `getCyclePhases` | `(cycle: Cycle) => CyclePhases`      | `lengthDays`, `mensesDays`, `follicularDays`, `lutealDays` and `peak`.        |
| `averagePhases`  | `(cycles: Cycle[]) => AveragePhases` | The averages per cycle, and `cyclesWithPeak`. All values are 0 for no cycles. |

## observationForm.ts

| Export                  | Signature                                                                           | Returns                                                        |
| ----------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `EMPTY_FIELDS`          | `ObservationFields`                                                                 | The form values of a new day.                                  |
| `fieldsFromObservation` | `(obs: Observation \| undefined) => ObservationFields`                              | The form values of a saved day.                                |
| `hasFieldChanges`       | `(fields: ObservationFields, saved: Observation \| undefined) => boolean`           | `true` if the form is different from the saved day.            |
| `needsCycleStartChoice` | `(fields: ObservationFields, date: string, observations: Observation[]) => boolean` | `true` if the form must ask the **New Cycle Start?** question. |

## dataValidator.ts

| Function              | Signature                               | Returns                                                  |
| --------------------- | --------------------------------------- | -------------------------------------------------------- |
| `validateObservation` | `(raw: unknown) => Observation \| null` | A clean observation, or `null` if the date is not valid. |

## storageFormat.ts

| Export                   | Signature                                                  | Returns                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STORAGE_SCHEMA_VERSION` | `number`                                                   | The current version of the stored format: `1`.                                                                                                                       |
| `serializeObservations`  | `(observations: Observation[], indent?: number) => string` | The JSON text of `{ "schemaVersion": 1, "observations": [...] }`.                                                                                                    |
| `parseObservationData`   | `(text: string) => ObservationData \| null`                | The valid observations, one for each date, in date order, and `droppedCount`.`null` if the text is not JSON, not a supported format, or from a newer schema version. |

`parseObservationData` reads a bare JSON array (version 0) and the envelope (version 1). It calculates `codeString` again from the fields.

## backupReminder.ts

| Export                 | Signature                                                                                 | Returns                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `BACKUP_REMINDER_DAYS` | `number`                                                                                  | `30`.                                                                                                      |
| `isBackupDue`          | `(lastBackupDate: string \| null, observations: Observation[], today: string) => boolean` | `true` if observations exist and 30 days or more passed since the last backup, or since the earliest date. |

## backupImport.ts

| Function                | Signature                                                             | Returns                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `summarizeObservations` | `(observations: Observation[]) => BackupSummary`                      | The number of observations, the first date and the last date. The dates are `null` for an empty list.                                                                 |
| `mergeObservations`     | `(existing: Observation[], imported: Observation[]) => Observation[]` | All the days in date order. An imported day replaces the existing day with the same date. An imported manual Peak Day clears the other manual Peak Days of its cycle. |

## demoData.ts

| Function                | Signature                             | Returns                                                                              |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `buildDemoObservations` | `(todayStr: string) => Observation[]` | 56 days that end on `todayStr`: two 28-day cycles with the Peak Day on cycle day 13. |

## versionTracker.ts

| Export                      | Signature                                                          | Returns                                                                          |
| --------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `VERSION_HISTORY`           | `[VersionRelease, ...VersionRelease[]]`                            | The release notes, newest first, in English and French.                          |
| `getAppVersion`             | `() => string`                                                     | The version from `package.json`.                                                 |
| `getBuildDate`              | `() => string`                                                     | The build time, in ISO format.                                                   |
| `getVersionInfo`            | `() => VersionInfo`                                                | The version, build date, CrMS version, mode and repository.                      |
| `getVersionHistory`         | `() => VersionRelease[]`                                           | `VERSION_HISTORY`.                                                               |
| `getLatestRelease`          | `() => VersionRelease`                                             | The first item of `VERSION_HISTORY`.                                             |
| `checkAndRecordVersionSeen` | `() => { isNewVersion: boolean; previousVersion: string \| null }` | Compares the version with the last version seen, then saves the current version. |
| `getStorageStats`           | `() => StorageStats`                                               | The number of keys, the size and the cycle and observation counts.               |

## Related documents

- [Architecture](../explanation/architecture.md)
- [Data format](data-format.md)
