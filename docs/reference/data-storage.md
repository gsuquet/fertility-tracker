# Data storage

This page gives the rules for the state of the application and the data in the browser storage. For the reasons, read [Privacy and data storage](../explanation/privacy-and-data-storage.md). For the fields of an observation and the backup file, read [Data format](data-format.md).

**Source file:** [src/context/CycleContext.tsx](../../src/context/CycleContext.tsx)

## Contexts

| Context or hook                      | Content                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `CycleDataContext`, `useCycleData()` | Observations, cycles, selected cycle, save, delete, import, demo, clear, recovery and undo. |
| `CycleUiContext`, `useCycleUi()`     | The selected observation and the open drawer.                                               |
| `useCycle()`                         | Both contexts together.                                                                     |
- The two contexts are separate. Thus, the drawer does not make the chart and the calendar render again.
- `deleteObservation(id)` deletes only the observation with that `id`. A date does not match an observation.
- `LanguageProvider` and `ThemeProvider` memoize their values. Thus, a parent that renders again with the same values does not give new values.
- After each change, the application calculates the cycles, the Peak Days and the stamps again for all days. This includes a change of the manual Peak Day.
- `buildDemoObservations` makes 56 days that end today: two 28-day cycles with the Peak Day on cycle day 13.

## Storage keys

[storageKeys.ts](../../src/utils/storageKeys.ts) defines each key one time. All modules import the keys from this file.

| Constant                            | Key                                       | Content                                                                                                                   |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `STORAGE_OBSERVATIONS_KEY`          | `fertility_care_observations`             | All observations                                                                                                          |
| `STORAGE_RECOVERY_KEY`              | `fertility_care_observations_recovery`    | Copy of saved data that is not readable                                                                                   |
| `STORAGE_UNDO_KEY`                  | `fertility_care_observations_undo`        | Copy before the last replacing change                                                                                     |
| `STORAGE_LAST_BACKUP_KEY`           | `fertility_care_last_backup`              | Date of the last JSON backup, `YYYY-MM-DD`                                                                                |
| `STORAGE_BACKUP_REMINDER_START_KEY` | `fertility_care_backup_reminder_start`    | Start date of the backup reminder, `YYYY-MM-DD`                                                                           |
| `STORAGE_BACKUP_SNOOZED_UNTIL_KEY`  | `fertility_care_backup_snoozed_until`     | End date of the reminder snooze, `YYYY-MM-DD`                                                                             |
| `STORAGE_LANGUAGE_KEY`              | `fertility_care_lang`                     | Language: `en` or `fr`                                                                                                    |
| `STORAGE_THEME_KEY`                 | `fertility_care_theme`                    | Theme: `light` or `dark`                                                                                                  |
| `STORAGE_ENTRY_MODE_KEY`            | `fertility_care_entry_mode`               | Last entry mode of the Today page                                                                                         |
| `LAST_SEEN_VERSION_KEY`             | `fertility_tracker_last_seen_version`     | Last version that the user opened                                                                                         |
| `STORAGE_HAS_SEEN_WELCOME_KEY`      | `fertility_tracker_has_seen_welcome`      | The user closed the welcome guide                                                                                         |
| `STORAGE_INSTALL_BANNER_CLOSED_KEY` | `fertility_tracker_install_banner_closed` | The user closed the install banner or chose **Install** in it                                                             |
| `STORAGE_SHORTCUTS_OFF_KEY`         | `fertility_tracker_shortcuts_off`         | `true` when the user turned the keyboard shortcuts off ([Keyboard shortcuts](application-behavior.md#keyboard-shortcuts)) |
| `STORAGE_BADGE_ON_KEY`              | `fertility_tracker_badge_on`              | `true` when the user turned the app icon badge on ([App icon badge](application-behavior.md#app-icon-badge))              |
| `STORAGE_HAPTICS_OFF_KEY`           | `fertility_tracker_haptics_off`           | `true` when the user turned the vibrations off ([Haptic feedback](application-behavior.md#haptic-feedback))               |

## Storage format

[storageFormat.ts](../../src/domain/storageFormat.ts) controls the saved format of the observations.

| Format | Content                                                    |
| ------ | ---------------------------------------------------------- |
| 0      | A bare JSON array                                          |
| 1      | The object `{ "schemaVersion": 1, "observations": [...] }` |

`STORAGE_SCHEMA_VERSION = 1` is the newest format that the application reads. The change to format 1 occurs in two steps:

- **Step 1 (now):** The application reads both formats in the storage, the undo copy and backups. It still writes format 0, because `WRITE_SCHEMA_VERSION = 0`. Thus, versions 1.17.x and older can read all the data, for example after a rollback.
- **Step 2 (later):** When no installation runs a version older than 1.18.0, a release sets `WRITE_SCHEMA_VERSION` to 1. No other code changes.

`serializeObservations(observations, indent?, version = WRITE_SCHEMA_VERSION)` writes the data. `parseObservationData(text)` reads either format. It gives `{ observations, droppedCount }`, or `null` when it cannot read the text.

- A bare array keeps each valid record.
- An object without an `observations` array cannot be read. An object with a `schemaVersion` that is not an integer from 1 to `STORAGE_SCHEMA_VERSION` cannot be read.
- For data that it cannot read, the application uses the [data recovery](#data-recovery) rules. Thus, it never writes over data from a newer version.
- Each record goes through `validateObservation()`. `droppedCount` is the number of records that it rejects, for example a record without a valid `date`.
- Two records with the same date keep the last one. This is not a dropped record.
- `parseObservationData()` calculates `codeString` again with `formatCodeString()`. The function removes text in a saved code that no field holds. For example, `M custom` becomes `M`.
- The provider then calculates `stamp`, `cycleDay` and the Peak Day again.

## Data recovery

When `parseObservationData()` cannot read `fertility_care_observations`, the application starts with no observations. Before it saves, it copies the original text to `fertility_care_observations_recovery`. It does this only when that key is empty, so it never replaces a copy.

- `writeStorage` gives `false` when the browser refuses a write, for example when the storage is full.
- If the application cannot write the copy, it does not write `fertility_care_observations` until the observations change. The original text stays in its key.
- `useCycleData()` gives `recoveryData` (the original text or `null`), `recoveryKept` and `dismissRecovery()`. `recoveryKept` is `true` when the recovery key has the text.
- `dismissRecovery()` deletes the copy when `recoveryKept` is `true`. Otherwise, it only hides the message.
- `clearAllData()` also deletes the recovery copy and sets `recoveryData` to `null`. The undo copy stays.

When the saved list is readable but `droppedCount` is more than 0, the application shows the valid observations. It keeps the original text with the same rules. `useCycleData()` gives `droppedCount`.

- On a subsequent load, the application calculates `droppedCount` again from the recovery copy. If the copy is not readable, `droppedCount` is 0.
- `StorageRecoveryNotice` shows `storageRecovery.messagePartial` (copy kept) or `storageRecovery.messagePartialNoCopy` (no copy), with the number of dropped records.
- For one dropped record, it uses `messagePartialOne` and `messagePartialNoCopyOne`.

`StorageRecoveryNotice` shows an alert above the pages while `recoveryData` is set.

- **Download unreadable data** saves the original text as `fertility-tracker-data-recovery-YYYY-MM-DD.txt`.

| Condition                | Result                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `recoveryKept` is `true` | The message says that a copy is kept. The second button is **Delete the copy**.           |
| **Else**                 | The message says that the next change replaces the data. The second button is **Close**.  |

**Delete the copy** opens a confirmation (`confirmDialog.recoveryTitle`, `recoveryMessage`, `recoveryConfirm`). Only its confirm button calls `dismissRecovery()`.

## Save failure and persistent storage

- Each write of `fertility_care_observations` gives its result. `saveFailed` in `useCycleData()` is `true` after a refused write and `false` after the next write that succeeds.
- [StorageSaveWarning.tsx](../../src/components/StorageSaveWarning.tsx) shows an alert (`role="alert"`, `storageWarning.saveFailed`) above the pages while `saveFailed` is `true`. It has no close button.
- The alert has a **Back up now** button. It opens the export dialog, so the user can download the observations that are only in memory.
- When observations exist, the provider calls `requestPersistentStorage()` from [storage.ts](../../src/utils/storage.ts) one time. It calls `navigator.storage.persist()` to stop the browser from removing the data.
- `requestPersistentStorage()` gives `false` when the API is not available or fails. The application works the same when the browser refuses.

## Backup reminder

**Source files:** [backupReminder.ts](../../src/domain/backupReminder.ts), [BackupReminder.tsx](../../src/components/BackupReminder.tsx)

- **Backup Data** calls `markBackedUp()`. It saves the date of today in `fertility_care_last_backup` and in `lastBackupDate`.
- When the first observation that is not demo data exists, the provider saves today in `fertility_care_backup_reminder_start` (`backupReminderStart`). Before that, `backupReminderStart` is `null`. A value that exists does not change.
- `saveObservation()` gives a new `id` (`obs_DATE_TIME`) to a day whose `id` starts with `demo_`. Thus, a changed demo day is an observation of the user.
- Delete, the manual Peak Day and the merge find a day by its new `id` or by its date.

`isBackupDue({ lastBackupDate, reminderStart, snoozedUntil }, observations, today)` is `true` when all these conditions are true:

- At least one observation is not demo data. Its `id` does not start with `demo_`.
- No snooze is active. `snoozedUntil` is missing, is not a valid date, or is not after `today`.
- `BACKUP_REMINDER_DAYS` (30) days or more passed since the last backup. Without a valid backup date, the count starts at `reminderStart`. Without either date, the result is `false`.

`BackupReminder` shows a message (`role="note"`, `backupReminder.*`) above the pages while the backup is due. **Back up now** opens the export dialog. **Later** calls `snoozeBackupReminder()`, which saves today plus `BACKUP_SNOOZE_DAYS` (7) in `fertility_care_backup_snoozed_until`. Thus, the message stays hidden after a reload.

## Undo of replaced data

Before `loadDemoData()`, `importDataJson()` or `clearAllData()` changes the observations, the provider writes them to `fertility_care_observations_undo`. It uses the write format of [Storage format](#storage-format).

- While a copy exists, a second replacing change does not replace it. Thus, **Undo** after the demo and a reset brings back the data from before the demo.
- `saveObservation()` and `deleteObservation()` delete the copy, as `dismissUndo()` does, and the message closes. Thus, **Undo** never removes a day that the user saved after the change.
- `undoPersisted` is `false` when `writeStorage` cannot write the copy. The message then adds `undoToast.notSaved`: **Undo** works only until the page loads again.
- `undoChange` is the last change that the copy can undo: `'demo'`, `'import'`, `'merge'`, `'clear'` or `'earlier'`. It is `null` without a copy.
- `undoLastChange()` restores the copy, selects its newest cycle and deletes the copy. `dismissUndo()` deletes the copy and keeps the change.
- At start, if the undo key has readable data, `undoChange` is `'earlier'`. Thus, the copy stays available after a reload.
- [UndoToast.tsx](../../src/components/UndoToast.tsx) shows a message (`role="status"`, `undoToast.*`) while `undoChange` is set. It has **Undo** and **Delete the copy** buttons, and it does not close by itself.

## Related documents

- [Data format](data-format.md)
- [Privacy and data storage](../explanation/privacy-and-data-storage.md)
- [Back up and restore your data](../how-to/back-up-and-restore-your-data.md)
