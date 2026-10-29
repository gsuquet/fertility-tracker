# Export dialog

This page gives the rules for the export dialog: print, backup, restore, demo data and reset.

## Behavior

| Action              | Result                                                                                |
| ------------------- | ------------------------------------------------------------------------------------- |
| Print / Save as PDF | Prints one cycle or the selected cycles with the browser print dialog.                |
| Backup Data         | Downloads `fertility-tracker-backup-YYYY-MM-DD.ftbackup` and records the backup date. |
| Restore Data        | Shows a preview, then replaces or merges the observations with the file.              |
| Load Demo Cycle     | Replaces all observations with the demo data.                                         |
| Clear Data / Reset  | Deletes all observations.                                                             |

`getExportFilename()` makes file names with only lowercase letters, digits and dashes. There is no PNG export.

### Backup file

- The file uses the write format of the browser storage ([Storage format](../data-storage.md#storage-format)). In this version, that is a bare JSON array, so older versions can restore it.
- **Restore Data** accepts the bare array (format 0) and the object `{ "schemaVersion": 1, "observations": [...] }` (format 1).
- The file is plain JSON. It is not encrypted. The texts `exportModal.jsonDescription` and `exportModal.pdfDescription` tell this to the user.
- The file has the extension `.ftbackup` and the type `application/octet-stream`. With `application/json`, a browser can add `.json` after the name. The content is plain JSON, and any text editor can open it.
- The file input has no `accept` filter. iOS greys out a file with an extension that it does not know. The application checks the contents, not the extension. Thus, a `.ftbackup` file and an old `.json` backup both restore.
- A file that is not a valid backup shows `exportModal.importError` in the export dialog. The data does not change.

### Confirmation

[ConfirmDialog.tsx](../../../src/components/ConfirmDialog.tsx) is a small confirmation dialog. It replaces `window.confirm()` and `window.alert()`, which no code in `src/` uses.

- It opens over the export dialog. All its text comes from the dictionary (`confirmDialog.*`, `actions.cancel`).
- `Escape`, **Cancel** and a click on the backdrop cancel it. They do not close the export dialog.
- **Load Demo Cycle**, **Restore Data** and **Clear Data / Reset** open it when observations exist.
- Without observations, **Load Demo Cycle** and **Restore Data** act immediately, and **Clear Data / Reset** is disabled.
- The message for **Clear Data / Reset** says that a copy stays on the device until the user selects **Delete the copy**.

Before a backup changes existing observations, the dialog shows a preview from `summarizeObservations()`. The preview gives the number of observations in the file and the first and last date. If the file has no observations, the preview says so.

| Action  | Result                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------- |
| Replace | `importDataJson(text, 'replace')`: the file replaces all the current observations.                                      |
| Merge   | `importDataJson(text, 'merge')`: each day of the file replaces the current day with the same date. The other days stay. |

During a merge, `mergeObservations()` keeps one manual Peak Day in each cycle. When a day of the file is a manual Peak Day, it clears the manual Peak Day of the current days in the same cycle.

### Print

1. The dialog names the selection: `cycle-N`, `selected-cycles` or `all-cycles`.
2. The application sets the document title to the file name, for example `fertility-tracker-chart-cycle-1-YYYY-MM-DD`.
3. The application calls `window.print()`. The browser uses the title as the default PDF file name.
4. The application restores the title one second later. A second print in that second restores the first title.
5. The application closes the dialog. It shows the success message when the user clicks, before the print starts. The message closes 3.5 seconds after the last print.

When the application unmounts, it stops the title and message timers.

The print layout:

- It is landscape, with 35 days in each row. It hides the user interface.
- It does not show the day of the week. It removes the spaces from the codes and lets a long code go onto two lines.
- It has a line under the code of each day for the notes.
- Without cycles, it shows one empty cycle that starts today (`getTodayStr()`).
- It uses the language of the interface: `printExport.*`, `chartStrip.*` and `t.locale` for the export date. The CrMS codes and the stamp colors are the same in each language.
- The date of each cell uses `common.monthDay`: `MM-DD` in English and `DD/MM` in French.
- Each legend label is one text: `chartStrip.legendMenses`, `legendDry`, `legendFertile`, `legendPostPeak` and `legendPeakDay`. The chart legend uses the same texts.

## Accessibility

- **Restore Data** is a button that opens a hidden file input. Thus, the keyboard can reach it.
- The message `exportModal.importError` has `role="alert"`.
- The confirmation dialog has `aria-labelledby` (its title) and `aria-describedby` (its message). When it opens, the focus goes to **Cancel**.

## Implementation

- [ExportModal.tsx](../../../src/components/ExportModal.tsx)
- [PrintExportView.tsx](../../../src/components/PrintExportView.tsx)
- [exportUtils.ts](../../../src/utils/exportUtils.ts)
- [backupImport.ts](../../../src/domain/backupImport.ts)

## Related documents

- [Data storage](../data-storage.md)
- [Data format](../data-format.md)
- [Application behavior](../application-behavior.md)
- [Dialog component](../dialog-component.md)
- [User interface](../user-interface.md)
