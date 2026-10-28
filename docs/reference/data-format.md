# Data format

This page gives the format of the data that the application keeps in the browser and writes to a backup file. The types are in `src/types/crms.ts`.

## Browser storage keys

The application uses `localStorage`. It sends no data to a server.

| Key                                    | Content                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `fertility_care_observations`          | All observations, in the versioned format.                                    |
| `fertility_care_observations_recovery` | A copy of observation data that the application cannot read.                  |
| `fertility_care_observations_undo`     | A copy of the observations from before the last restore, demo load or delete. |
| `fertility_care_last_backup`           | The date of the last backup file, `YYYY-MM-DD`.                               |
| `fertility_care_backup_reminder_start` | The start of the first backup reminder period, `YYYY-MM-DD`.                  |
| `fertility_care_backup_snoozed_until`  | The backup reminder stays hidden before this date, `YYYY-MM-DD`.              |
| `fertility_care_theme`                 | `light` or `dark`.                                                            |
| `fertility_care_lang`                  | `en` or `fr`.                                                                 |
| `fertility_care_entry_mode`            | The last entry mode of the **Today** page.                                    |
| `fertility_tracker_has_seen_welcome`   | Set when you close the welcome guide.                                         |
| `fertility_tracker_last_seen_version`  | The last application version that you opened.                                 |

If the application cannot read the value of `fertility_care_observations`, it starts with no observations. Before it saves, it copies the value to `fertility_care_observations_recovery`.

If the value has some items that are not valid, the application shows the valid observations. It also copies the value to `fertility_care_observations_recovery`, and a message gives the number of items that it cannot read.

The application does not replace a copy that is already in `fertility_care_observations_recovery`. If the application cannot write the copy, it keeps the original value in `fertility_care_observations`. Your next change replaces that value.

Before a restore, a demo load or a delete of all data, the application copies the observations to `fertility_care_observations_undo`. If a copy already exists, the application keeps the older copy. **Undo**, **Delete the copy**, a saved observation and a deleted observation delete the copy.

## Versioned format

The application knows two formats of the observations:

| Version | Format                                          | Reads             | Writes                  |
| ------- | ----------------------------------------------- | ----------------- | ----------------------- |
| 0       | A JSON array of observations.                   | All versions.     | All versions until now. |
| 1       | `{ "schemaVersion": 1, "observations": [...] }` | 1.18.0 and later. | A later version.        |

Version 1.18.0 reads the two formats in `fertility_care_observations`, in `fertility_care_observations_undo` and in a backup file. It writes only version 0. Thus an older version of the application can read all the data, for example after a downgrade.

A later version will write version 1. It will do this when no installation uses a version older than 1.18.0. In the code, this change is the value of `WRITE_SCHEMA_VERSION` in `src/domain/storageFormat.ts`.

The application cannot read a `schemaVersion` that is higher than `1`. It then keeps the data, as for data that it cannot read.

## Backup file

A backup file has the format that the application writes. In version 1.18.0, it is a JSON array of observations. The file is not encrypted. The application restores a backup file in version 0 or in version 1.

```json
[
  {
    "id": "obs_2026-10-24_1761300000000",
    "date": "2026-10-24",
    "cycleDay": 2,
    "stretch": "10",
    "modifiers": ["K", "L"],
    "frequency": "AD",
    "symptoms": [],
    "intercourse": false,
    "notes": "",
    "isManualPeak": false,
    "stamp": "WHITE_BABY",
    "codeString": "10KLAD",
    "isPeakDay": true
  }
]
```

## Observation fields

| Field          | Type                | Required | Description                                                    |
| -------------- | ------------------- | -------- | -------------------------------------------------------------- |
| `id`           | string              | No       | Unique identifier. The application makes one if it is missing. |
| `date`         | string `YYYY-MM-DD` | Yes      | The date of the observation. One observation for each date.    |
| `cycleDay`     | number              | No       | Calculated again after each change.                            |
| `bleeding`     | bleeding code       | No       | `H`, `M`, `L`, `VL` or `B`.                                    |
| `stretch`      | stretch code        | No       | For example `0`, `6` or `10WL`.                                |
| `modifiers`    | array of codes      | No       | Appearance codes, for example `["K", "L"]`.                    |
| `frequency`    | frequency code      | No       | `X1`, `X2`, `X3` or `AD`.                                      |
| `symptoms`     | array of codes      | No       | `AP`, `RAP` or `LAP`.                                          |
| `intercourse`  | boolean             | No       | `true` if intercourse occurred.                                |
| `notes`        | string              | No       | Free text.                                                     |
| `isManualPeak` | boolean             | No       | `true` if you set this day as the Peak Day.                    |
| `isCycleStart` | boolean             | No       | Your answer to the **New Cycle Start?** question.              |
| `stamp`        | stamp type          | No       | Calculated again after each change.                            |
| `codeString`   | string              | No       | The code of the day. Calculated again from the fields on load. |
| `isPeakDay`    | boolean             | No       | Calculated again after each change.                            |

## Validation of a restored file

When you restore a file, the application does these checks:

- It accepts only version 0 or version 1 of the format. Other files cause the restore to fail.
- It ignores an item that has no valid `date`.
- It ignores a code that is not in the lists of [Observation codes](observation-codes.md).
- If two items have the same date, it keeps the last item.
- It calculates `codeString`, `stamp`, `cycleDay` and `isPeakDay` again.
- It makes `codeString` again from the fields. It does not keep other text in a stored `codeString`. For example, `M custom` becomes `M`.

If you have observations, you select **Replace** or **Merge**:

- **Replace** deletes the current observations and keeps only the file.
- **Merge** keeps the current observations. A day of the file replaces the current day with the same date.
- If a day of the file is a manual Peak Day, **Merge** removes the other manual Peak Days of that cycle.

The validation is in `src/domain/dataValidator.ts`.

## Related documents

- [Back up and restore your data](../how-to/back-up-and-restore-your-data.md)
- [Privacy and data storage](../explanation/privacy-and-data-storage.md)
