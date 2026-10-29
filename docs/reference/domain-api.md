# Domain API

This page lists the exported functions of `src/domain/`. These functions are pure: they do not use React and they do not change their arguments. The exceptions are `versionTracker.ts` and `appVersion.ts`, which read and write `localStorage`.

## codeParser.ts

The parser follows version `1.1.0` of the CrMS specification (`CRMS_SPEC_VERSION` in `versionTracker.ts`).

| Function                | Signature                                                 | Returns                                                                       |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `formatCodeString`      | `(obs: ObservationInput) => string`                       | The code string, for example `"10KLX3 I AP"`. The symptoms come last.         |
| `parseCodeString`       | `(input: string) => ParsedCodeResult`                     | The fields of a typed code, and `formattedCode`. Unknown letters are ignored. |
| `appendMissingSymptoms` | `(codeString: string, symptoms: SymptomCode[]) => string` | The stored code string with each missing symptom code added at the end.       |

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

| Function                   | Signature                                        | Returns                                                                        |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `processCycleObservations` | `(observations: Observation[]) => Observation[]` | The days of one cycle in date order, with `cycleDay`, `stamp` and `isPeakDay`. |

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

| Export                   | Signature                                                                    | Returns                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `STORAGE_SCHEMA_VERSION` | `number`                                                                     | The newest format that the application reads: `1`.                                                                                             |
| `WRITE_SCHEMA_VERSION`   | `0 \| 1`                                                                     | The format that the application writes: `0`.                                                                                                   |
| `serializeObservations`  | `(observations: Observation[], indent?: number, version?: 0 \| 1) => string` | The JSON text. Version 0 is a bare array. Version 1 is `{ "schemaVersion": 1, "observations": [...] }`. The default is `WRITE_SCHEMA_VERSION`. |
| `parseObservationData`   | `(text: string) => ObservationData \| null`                                  | The valid observations, one for each date, in date order, and `droppedCount`.`null` if the application cannot read the text.                   |

`parseObservationData` reads a bare JSON array (version 0) and the envelope (version 1). It calculates `codeString` again from the fields.

## backupReminder.ts

| Export                 | Signature                                                                             | Returns                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `BACKUP_REMINDER_DAYS` | `number`                                                                              | `30`.                                                                                                                                      |
| `BACKUP_SNOOZE_DAYS`   | `number`                                                                              | `7`.                                                                                                                                       |
| `DEMO_ID_PREFIX`       | `string`                                                                              | `demo_`, the start of the id of a demo observation.                                                                                        |
| `isUserObservation`    | `(obs: Observation) => boolean`                                                       | `true` if the observation is not demo data.                                                                                                |
| `hasUserObservations`  | `(observations: Observation[]) => boolean`                                            | `true` if one observation or more is not demo data.                                                                                        |
| `isBackupDue`          | `(dates: BackupReminderDates, observations: Observation[], today: string) => boolean` | `true` when: a day that is not demo data exists; no snooze is active; 30 days or more passed since `lastBackupDate`, else `reminderStart`. |

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

The rules are in [Version tracker](version-tracker.md).

| Export              | Signature                               | Returns                                                            |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `VERSION_HISTORY`   | `[VersionRelease, ...VersionRelease[]]` | The release notes, newest first, in English and French.            |
| `getVersionInfo`    | `() => VersionInfo`                     | The version, build date, CrMS version, mode and repository.        |
| `getVersionHistory` | `() => VersionRelease[]`                | `VERSION_HISTORY`.                                                 |
| `getLatestRelease`  | `() => VersionRelease`                  | The first item of `VERSION_HISTORY`.                               |
| `getStorageStats`   | `() => StorageStats`                    | The number of keys, the size and the cycle and observation counts. |

Only the **About & Version Tracker** dialog imports this file. Thus, the release notes are not in the main JavaScript file.

## appVersion.ts

The main JavaScript file imports this file. It must not import `versionTracker.ts`.

| Export                      | Signature                                                          | Returns                                                                          |
| --------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `getAppVersion`             | `() => string`                                                     | The version from `package.json`.                                                 |
| `getBuildDate`              | `() => string`                                                     | The build time, in ISO format.                                                   |
| `checkAndRecordVersionSeen` | `() => { isNewVersion: boolean; previousVersion: string \| null }` | Compares the version with the last version seen, then saves the current version. |

## Related documents

- [Architecture](../explanation/architecture.md)
- [Data format](data-format.md)
