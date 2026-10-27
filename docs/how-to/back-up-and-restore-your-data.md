# Back up and restore your data

Use these procedures to keep a copy of your data in a file. Use the file to move your data to a different browser or device.

The application keeps your data only in this browser. If you clear the browser data, you lose your observations. Make a backup regularly.

## Make a backup

1. Click **Practitioner PDF / PNG**. On a phone, click the menu button and then **Practitioner PDF / PNG**.
2. Click **Backup Data (JSON)**.
3. Keep the file in a safe location.

The file name has the date, for example `fertility-tracker-data-backup-2026-10-27.json`. The file is not encrypted. It contains your health data. Do not share it with people who must not see your data.

## Restore a backup

> **CAUTION:** A restore replaces all the observations in this browser. Make a backup of the current data first if you want to keep it.
1. Click **Practitioner PDF / PNG**.
2. Click **Restore Data (JSON)**.
3. Select the backup file.
4. If the dialog shows "This file is not a valid backup", select a different file.
5. If you have observations, the **Restore this backup?** dialog opens. Click **Replace**.
6. Look at the chart. If it is not correct, click **Undo** in the toast at the bottom of the page.

## Result

The application shows the observations of the backup file. It calculates the cycles, stamps and Peak Days again.

## Related documents

- [Data format](../reference/data-format.md)
- [Privacy and data storage](../explanation/privacy-and-data-storage.md)
