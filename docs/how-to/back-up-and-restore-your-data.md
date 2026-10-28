# Back up and restore your data

Use these procedures to keep a copy of your data in a file. Use the file to move your data to a different browser or device.

The application keeps your data only in this browser. If you clear the browser data, you lose your observations. Make a backup regularly.

## Make a backup

1. Click **Practitioner PDF / PNG**. On a phone, click the menu button and then **Practitioner PDF / PNG**.
2. Click **Backup Data (JSON)**.
3. Keep the file in a safe location.

The application records the date of the backup. After 30 days, it shows a reminder at the top of the page. To make a backup from the reminder, click **Back up now**. To hide the reminder for 7 days, click **Later**. The application does not show the reminder for the demo data.

The file name has the date, for example `fertility-tracker-data-backup-2026-10-27.json`. The file is not encrypted. It contains your health data. Do not share it with people who must not see your data.

## Restore a backup

> **CAUTION:** **Replace** deletes all the observations in this browser. Make a backup of the current data first if you want to keep it.
1. Click **Practitioner PDF / PNG**.
2. Click **Restore Data (JSON)**.
3. Select the backup file.
4. If the dialog shows "This file is not a valid backup", select a different file. A file from a newer version of the application can be not valid.
5. If you have observations, the **Restore this backup?** dialog opens. Read the number of observations and the dates of the file.
6. Select how to use the file:
   - To keep only the observations of the file, click **Replace**.
   - To add the file to your observations, click **Merge**. A day of the file replaces your day with the same date.
7. Look at the chart. If it is not correct, click **Undo** in the toast at the bottom of the page.

## Result

The application shows the observations of the backup file, or your observations merged with the file. It calculates the cycles, stamps, codes and Peak Days again. You can restore a backup file from an older version of the application.

## Related documents

- [Data format](../reference/data-format.md)
- [Privacy and data storage](../explanation/privacy-and-data-storage.md)
