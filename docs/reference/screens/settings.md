# Settings

This page gives the rules for **Settings**: the display settings, backup, restore, help, about, demo data and the delete of all data.

## Layout

The test `e2e/screenLayout.spec.ts` compares the ARIA snapshots with the screen, with the demo data. Read [ADR 0006](../../records/adrs/0006-screen-layout-snapshots-and-screenshots.md).

| Size                     | Screenshot                                      | ARIA snapshot                                                |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------------ |
| Phone, 390 by 844 pixels | [settings-phone.png](images/settings-phone.png) | [settings-phone.aria.yml](snapshots/settings-phone.aria.yml) |
| Wide, 1440 by 900 pixels | [settings-wide.png](images/settings-wide.png)   | [settings-wide.aria.yml](snapshots/settings-wide.aria.yml)   |

![Settings on a phone](images/settings-phone.png)

| Condition                             | Result                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| The screen is 640 pixels wide or less | A full page over the bottom bar. It does not slide and the user cannot drag it. The close button is a back chevron at the left. |
| **Else**                              | A dialog of 560 pixels. The close button is an `X` at the right.                                                                |

## Behavior

The **Settings** gear in the header opens Settings on each screen width. On a phone, the gear is the last control of the top bar ([Navigation](navigation.md)).

The close button, **Back** and `Escape` close Settings.

Settings has these groups, in this sequence:

| Group                    | Rows                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install                  | **Install app**, its hint and an **Install** button. It shows only when the browser can install the application.                                      |
| **Appearance and input** | **Language**, **Theme**, **Vibration**, **App icon badge** and **Use keyboard shortcuts**.                                                            |
| **Backup and restore**   | **Back up now**, **Back up with a password** and **Restore from a file**. Under the group, a note tells which file is encrypted.                      |
| **Help**                 | **Welcome guide** and **Keyboard shortcuts**.                                                                                                         |
| **About**                | **About Fertility Tracker** (detail "Release notes, storage", with the version at the right), **Legal and medical notice** and **Check for updates**. |
| **Data**                 | **Load the demo cycles** and **Delete all data**. **Delete all data** is the last row. Its text is red (`--color-danger-text`).                       |

### Rows

| Row                           | Result                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Install**                   | Installs the application, as the other install buttons do ([Install](../application-behavior.md#install)).                       |
| **Language**                  | A native select of the languages. Each name is in its own language. The change applies at once.                                  |
| **Theme**                     | Two radio buttons: **Light** and **Dark**.                                                                                       |
| **Vibration**                 | A switch. It shows only when the browser has the Vibration API ([Haptic feedback](../application-behavior.md#haptic-feedback)).  |
| **App icon badge**            | A switch. It shows only when the browser has the Badging API ([App icon badge](../application-behavior.md#app-icon-badge)).      |
| **Use keyboard shortcuts**    | A switch. It turns all the single-key shortcuts on or off ([Keyboard shortcuts](../application-behavior.md#keyboard-shortcuts)). |
| **Back up now**               | Downloads `fertility-tracker-backup-YYYY-MM-DD.ftbackup` at once and records the backup date. Settings stays open.               |
| **Back up with a password**   | Opens the [password dialog](#password-dialog) for a backup. Settings stays open.                                                 |
| **Restore from a file**       | Opens the file picker. Then it shows a preview and replaces or merges the observations with the file.                            |
| **Welcome guide**             | Opens the welcome guide over Settings.                                                                                           |
| **Keyboard shortcuts** (Help) | Opens the **Keyboard shortcuts** dialog over Settings.                                                                           |
| **About Fertility Tracker**   | Opens the version dialog over Settings, on the release notes ([Version dialog](version-dialog.md)).                              |
| **Legal and medical notice**  | Opens the version dialog over Settings, at the legal notice.                                                                     |
| **Check for updates**         | Asks the browser for a new version at once ([Update](../application-behavior.md#update)). Settings stays open.                   |
| **Load the demo cycles**      | Replaces all observations with the demo data.                                                                                    |
| **Delete all data**           | Deletes all observations.                                                                                                        |
- The options of **Language** are "English" and "Français".
- The detail of **Back up now** is "Last backup: " and the date of the last backup, for example "Last backup: Oct 27, 2026". Without a backup, it is "No backup yet".
- **Restore from a file**, **Load the demo cycles** and **Delete all data** close Settings after they run.
- **Check for updates** shows the result of the check in its detail. A hidden `role="status"` text reads it aloud. While the check runs, the detail is "Checking…" and a new tap does nothing. Then the detail is "You have the latest version", "The check failed. Check your connection and try again" or "Updates are not available in this browser".
- When a new version is ready, the row is **Reload to update** with the detail "A new version is ready". A tap applies the update with `applyUpdate()`, and the application reloads one time. The update message at the bottom of the screen hides while Settings is open. Thus, this row applies the update from Settings.
- `useBackUpNow()` gives the action of **Back up now**. The backup reminder and the save warning use the same hook ([Data storage](../data-storage.md#backup-reminder)).
- A backup file that the user opens with the application opens Settings. Settings then restores the file, as **Restore from a file** does ([Open a backup file with the app](../application-behavior.md#open-a-backup-file-with-the-app)).
- **Restore a backup** of the welcome guide opens Settings with the focus on **Restore from a file** ([Welcome guide](welcome-guide.md)).

### Backup file

- The file uses the write format of the browser storage ([Storage format](../data-storage.md#storage-format)). In this version, that is a bare JSON array, so older versions can restore it.
- **Restore from a file** accepts the bare array (format 0) and the object `{ "schemaVersion": 1, "observations": [...] }` (format 1).
- The file of **Back up now** is plain JSON. It is not encrypted. The file of **Back up with a password** is encrypted ([Encrypted backup file](../data-format.md#encrypted-backup-file)). The note under **Backup and restore** (`exportModal.jsonDescription`) tells this to the user.
- The file has the extension `.ftbackup` and the type `application/octet-stream`. With `application/json`, a browser can add `.json` after the name. The content is plain JSON, and any text editor can open it.
- The file input has no `accept` filter. iOS greys out a file with an extension that it does not know. The application checks the contents, not the extension. Thus, a `.ftbackup` file and an old `.json` backup both restore.
- A file that is not a valid backup shows `exportModal.importError` under the note. The data does not change.
- An encrypted file opens the password dialog for a restore. After the decryption, the restore continues as for a plain file.

### Password dialog

[PasswordDialog.tsx](../../../src/components/settings/PasswordDialog.tsx) opens over Settings. It has two modes:

| Mode    | Title                        | Fields                                    | Button                    |
| ------- | ---------------------------- | ----------------------------------------- | ------------------------- |
| Backup  | **Back up with a password**  | **Password** and **Confirm the password** | **Save encrypted backup** |
| Restore | **Open an encrypted backup** | **Password**                              | **Open the file**         |

- In the backup mode, a note says that nobody can open the file without the password. The application cannot reset it.
- **Cancel**, `Escape` and a click on the backdrop close the password dialog. Settings stays open, and the data does not change.
- They also close it while the encryption or the decryption runs. The application then drops the result: no file downloads, and no preview opens.
- `Enter` in a field submits the form.
- While the encryption or the decryption runs, the button is disabled and shows `passwordDialog.working`.

When the user submits the backup mode:

| Condition                                 | Result                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| The password has fewer than 12 characters | The message `passwordDialog.tooShort` shows. No file downloads.                                                    |
| The two fields are different              | The message `passwordDialog.mismatch` shows. No file downloads.                                                    |
| The encryption fails                      | The message `passwordDialog.failed` shows. No file downloads.                                                      |
| **Else**                                  | Downloads `fertility-tracker-backup-YYYY-MM-DD-encrypted.ftbackup`, records the backup date and closes the dialog. |

When the user submits the restore mode:

| Condition            | Result                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| The decryption fails | The message `passwordDialog.wrongPassword` shows. The data does not change.     |
| **Else**             | The dialog closes. Settings shows the preview of the file, as for a plain file. |

### Confirmation

[ConfirmDialog.tsx](../../../src/components/ConfirmDialog.tsx) is a small confirmation dialog. It replaces `window.confirm()` and `window.alert()`, which no code in `src/` uses.

- It opens over Settings. All its text comes from the dictionary (`confirmDialog.*`, `actions.cancel`).
- `Escape`, **Cancel** and a click on the backdrop cancel it. They do not close Settings.
- These buttons open it:

| Condition          | Result                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Observations exist | **Load the demo cycles**, **Restore from a file** and **Delete all data** open the confirmation.       |
| **Else**           | **Load the demo cycles** and **Restore from a file** act immediately. **Delete all data** is disabled. |
- The message for **Delete all data** says that a copy stays on the device until the user selects **Delete the copy**.

Before a backup changes existing observations, the dialog shows a preview from `summarizeObservations()`. The preview gives the number of observations in the file and the first and last date. If the file has no observations, the preview says so.

| Action  | Result                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------- |
| Replace | `importDataJson(text, 'replace')`: the file replaces all the current observations.                                      |
| Merge   | `importDataJson(text, 'merge')`: each day of the file replaces the current day with the same date. The other days stay. |

During a merge, `mergeObservations()` keeps one manual Peak Day in each cycle. When a day of the file is a manual Peak Day, it clears the manual Peak Day of the current days in the same cycle.

### Sync group

While `SYNC_ENABLED` is `false`, Settings has no **Sync** group ([Sync client](../sync-client.md#sync-in-the-application)). When it is `true`, the group is after **Backup and restore**. [SyncSettings.tsx](../../../src/components/settings/SyncSettings.tsx) shows these rows:

| Device record of this device | Rows                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| None                         | **Turn on sync** and **Recover with a code**                             |
| Owner                        | **Sync now**, **New recovery code** and **Turn off sync on this device** |
| Reader                       | **Sync now** and **Turn off sync on this device**                        |

| Row                              | Result                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Turn on sync**                 | Makes a vault with `createVault()`, then syncs. It shows the [recovery code](#recovery-code-dialog).                     |
| **Recover with a code**          | Opens the code dialog. **Recover** calls `recoverWithCode()`, then syncs. It shows the new recovery code.                |
| **Sync now**                     | Starts a sync at once. The detail is "Last sync: " and the date, or "Not synced yet".                                    |
| **New recovery code**            | Makes a new code with `newRecoveryCode()`. It shows the new code. The old code stops working.                            |
| **Turn off sync on this device** | Asks for a confirmation. Then it deletes the device record, the sync state and the conflict list. The observations stay. |

- Each row runs after the sync that runs, with the sync lock ([Sync control](../sync-client.md#sync-control)). Thus, a sync cannot write the record or the state again after **Turn off sync on this device**.
- While a row runs, the rows of the group are disabled. Settings does not close, so that the user sees the new recovery code.
- **Turn on sync** and **Recover** remove the demo days from this device before the device joins the vault. When the browser refuses this write, the device does not join.
- When a row fails, an alert under the group gives the cause. While the device has a record, the alert also gives the cause of a failed sync. The causes are no connection, sync not available yet, a code that is not valid, or another error.
- While the device has a record, the **Data** group does not show **Load the demo cycles** ([ADR 0012](../../records/adrs/0012-encrypted-sync-and-partner-sharing.md#data-that-syncs)).
- **Turn off sync on this device** does not remove the device from the keyring. An owner device can remove it later.

While **Recover** runs, the code dialog does not close. **Cancel** is disabled, and `Escape`, Back and a drag down do nothing.

### Recovery code dialog

The dialog shows the code in groups of 4 characters, in a monospace font. The text tells the user to write down the code and to keep it in a safe place. Without the code and without a device, nobody can open the vault.

- **Copy** copies the code to the clipboard. After the copy, the button shows **Copied**.
- **I wrote it down** closes the dialog. The dialog has no other close button. `Escape`, Back and a click on the backdrop do nothing.

### Load

Settings is a lazy chunk. The application imports it when the browser is idle, as it imports the other dialogs ([Code splitting and lazy loading](../technology.md#code-splitting-and-lazy-loading)).

## Accessibility

- Settings is a dialog of the [dialog component](../dialog-component.md), with the name "Settings". The close button has the name "Close settings".
- Each group is a `<section>` (role `region`) with an `h3` title, and its rows are a list.
- **Theme** is a `<fieldset>` with the legend "Theme". **Light** and **Dark** are radio buttons.
- **Vibration**, **App icon badge** and **Use keyboard shortcuts** are buttons with `role="switch"` and `aria-checked`.
- The name of each row button is only its label (`aria-labelledby`). Its detail line, for example "Last backup: Oct 20, 2026" or "Release notes, storage", is its description (`aria-describedby`).
- The detail of **App icon badge** is "Show a dot on the app icon when today has no observation". On Apple systems, the text about the permission for notifications follows it. While the system asks for the permission, the switch is disabled.
- **Restore from a file** is a button that opens a hidden file input. Thus, the keyboard can reach it.
- The password dialog is a dialog of the [dialog component](../dialog-component.md), with its title as its name. The focus starts on **Password**.
- Each password field is an `<input type="password">` with a visible label. The backup mode uses `autocomplete="new-password"`, and the restore mode uses `autocomplete="current-password"`.
- The messages of the password dialog have `role="alert"`.
- The messages `exportModal.importError` and `appBadge.denied` have `role="alert"`.
- The text of **Delete all data** uses `--color-danger-text`. It has a contrast of 4.5:1 or more in both themes ([Design system](../design-system.md)).
- The confirmation dialog has `aria-labelledby` (its title) and `aria-describedby` (its message). When it opens, the focus goes to **Cancel**.

## Implementation

- [settings/SettingsDialog.tsx](../../../src/components/settings/SettingsDialog.tsx)
- [AppBadgeSetting.tsx](../../../src/components/AppBadgeSetting.tsx)
- [ConfirmDialog.tsx](../../../src/components/ConfirmDialog.tsx)
- [settings/PasswordDialog.tsx](../../../src/components/settings/PasswordDialog.tsx)
- [useBackUpNow.ts](../../../src/hooks/useBackUpNow.ts)
- [encryptedBackup.ts](../../../src/domain/encryptedBackup.ts)
- [exportUtils.ts](../../../src/utils/exportUtils.ts)
- [backupImport.ts](../../../src/domain/backupImport.ts)
- [settings.css](../../../src/styles/views/settings.css)

## Related documents

- [ADR 0007: Phone-first shell and one Settings page](../../records/adrs/0007-phone-first-shell-and-settings.md)
- [Data storage](../data-storage.md)
- [Data format](../data-format.md)
- [Application behavior](../application-behavior.md)
- [Dialog component](../dialog-component.md)
- [User interface](../user-interface.md)
