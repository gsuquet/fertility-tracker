# Data format

This page gives the format of the data that the application keeps in the browser and writes to a backup file. The types are in `src/types/crms.ts`.

## Browser storage keys

The application uses `localStorage`. It sends no data to a server.

| Key                                    | Content                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `fertility_care_observations`          | All observations, as a JSON array.                                            |
| `fertility_care_observations_recovery` | A copy of observation data that the application cannot read.                  |
| `fertility_care_observations_undo`     | A copy of the observations from before the last restore, demo load or delete. |
| `fertility_care_theme`                 | `light` or `dark`.                                                            |
| `fertility_care_lang`                  | `en` or `fr`.                                                                 |
| `fertility_care_entry_mode`            | The last entry mode of the **Today** page.                                    |
| `fertility_tracker_has_seen_welcome`   | Set when you close the welcome guide.                                         |
| `fertility_tracker_last_seen_version`  | The last application version that you opened.                                 |

If the value of `fertility_care_observations` is not a JSON array, the application starts with no observations. Before it saves, it copies the value to `fertility_care_observations_recovery`.

The application does not replace a copy that is already in `fertility_care_observations_recovery`. If the application cannot write the copy, it keeps the original value in `fertility_care_observations`. Your next change replaces that value.

Before a restore, a demo load or a delete of all data, the application copies the observations to `fertility_care_observations_undo`. If a copy already exists, the application keeps the older copy. **Undo**, **Delete the copy**, a saved observation and a deleted observation delete the copy.

## Backup file

A backup file is a JSON array of observations. It is the same as the value of `fertility_care_observations`. The file is not encrypted.

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
| `codeString`   | string              | No       | The code of the day. Made from the fields if it is missing.    |
| `isPeakDay`    | boolean             | No       | Calculated again after each change.                            |

## Validation of a restored file

When you restore a file, the application does these checks:

- It accepts only a JSON array. If the file is not an array, the restore fails.
- It ignores an item that has no valid `date`.
- It ignores a code that is not in the lists of [Observation codes](observation-codes.md).
- If two items have the same date, it keeps the last item.
- It calculates `stamp`, `cycleDay` and `isPeakDay` again.

If you have observations, you select **Replace** or **Merge**:

- **Replace** deletes the current observations and keeps only the file.
- **Merge** keeps the current observations. A day of the file replaces the current day with the same date.

The validation is in `src/domain/dataValidator.ts`.

## Related documents

- [Back up and restore your data](../how-to/back-up-and-restore-your-data.md)
- [Privacy and data storage](../explanation/privacy-and-data-storage.md)
