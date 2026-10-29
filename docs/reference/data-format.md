# Data format

This page gives the format of the data that the application keeps in the browser and writes to a backup file. The types are in `src/types/crms.ts`.

## Browser storage

The application keeps all the data in `localStorage`. It sends no data to a server. The storage keys, the versioned format, the data recovery and the undo copy are in [Data storage](data-storage.md).

## Backup file

A backup file has the format that the application writes. In version 1.18.0, it is a JSON array of observations. The file is not encrypted. The application restores a backup file in format 0 or in format 1. Read [Storage format](data-storage.md#storage-format).

In version 1.30.0 and later, the file name ends with `.ftbackup`. The content is the same JSON. The application also restores an older file that ends with `.json`.

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

- It accepts only format 0 or format 1. Other files cause the restore to fail.
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

- [Data storage](data-storage.md)
- [Back up and restore your data](../how-to/back-up-and-restore-your-data.md)
- [Privacy and data storage](../explanation/privacy-and-data-storage.md)
