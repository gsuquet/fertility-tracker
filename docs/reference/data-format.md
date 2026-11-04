# Data format

This page gives the format of the data that the application keeps in the browser and writes to a backup file. The types are in `src/types/crms.ts`.

## Browser storage

The application keeps all the data in `localStorage`. It sends no data to a server. The storage keys, the versioned format, the data recovery and the undo copy are in [Data storage](data-storage.md).

## Backup file

A backup file has the format that the application writes. While `WRITE_SCHEMA_VERSION` is 0, it is a JSON array of observations. The file of **Back up now** is not encrypted. For an encrypted file, read [Encrypted backup file](#encrypted-backup-file). The application restores a backup file in format 0 or in format 1. Read [Storage format](data-storage.md#storage-format).

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

## Encrypted backup file

**Back up with a password** writes an encrypted backup file. The file name ends with `-encrypted.ftbackup`. The content is a JSON object:

```json
{
  "encryptedBackup": 1,
  "kdf": { "name": "PBKDF2", "hash": "SHA-256", "iterations": 600000, "salt": "base64" },
  "cipher": { "name": "AES-GCM", "iv": "base64" },
  "data": "base64"
}
```

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| `encryptedBackup` | The version of the format: `1`                             |
| `kdf.salt`        | 16 random bytes, in base64                                 |
| `kdf.iterations`  | 600,000 when the application writes the file               |
| `cipher.iv`       | 12 random bytes, in base64                                 |
| `data`            | The AES-256-GCM ciphertext with its 16-byte tag, in base64 |

- PBKDF2-SHA256 makes the AES-256 key from the password, the salt and the iterations.
- The plain text is the JSON of a normal backup file. The application compresses it with gzip.
- Before the encryption, the application adds the length of the compressed data in 4 bytes (big-endian). Then it adds zero bytes to the next multiple of 16,384 bytes. Thus, the size of the file does not show the number of observations. The vault uses the same functions ([Padded gzip](vault-format.md#padded-gzip)).
- The additional data of AES-GCM is the text `fertility-tracker-encrypted-backup:1:` followed by the iterations, a colon and the salt in base64. Thus, a change of the salt or of the iterations makes the decryption fail.
- The application restores a file only when `kdf.iterations` is an integer from 600,000 to 10,000,000.
- A wrong password and a changed file give the same result: the decryption fails, and the data does not change.

The functions are in `src/domain/encryptedBackup.ts` ([Domain API](domain-api.md#encryptedbackupts)).

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

## TypeScript types

The types are in `src/types/crms.ts`. The code lists are in [Observation codes](observation-codes.md#code-lists-in-the-source).

```typescript
export const BLEEDING_CODES = ['H', 'M', 'L', 'VL', 'B'] as const;
export type BleedingCode = (typeof BLEEDING_CODES)[number];

export const STRETCH_CODES = ['0', '2', '2W', '4', '6', '8', '10', '10DL', '10SL', '10WL'] as const;
export type MucusStretch = (typeof STRETCH_CODES)[number];

export const MODIFIER_CODES = ['B', 'C', 'C/K', 'G', 'K', 'L', 'P', 'Y'] as const;
export type MucusModifier = (typeof MODIFIER_CODES)[number];

export const FREQUENCY_CODES = ['X1', 'X2', 'X3', 'AD'] as const;
export type FrequencyCode = (typeof FREQUENCY_CODES)[number];

export const SYMPTOM_CODES = ['AP', 'RAP', 'LAP'] as const;
export type SymptomCode = (typeof SYMPTOM_CODES)[number];

// Subsets: MENSES_BLEEDING_CODES, PEAK_TYPE_STRETCH_CODES, PEAK_TYPE_MODIFIERS (see observation-codes.md)

export type StampType =
  | 'RED' // Bleeding
  | 'DARK_GREEN' // Dry day
  | 'WHITE_BABY' // Peak-type mucus
  | 'LIGHT_GREEN_BABY_1' // Count of three, day 1
  | 'LIGHT_GREEN_BABY_2' // Count of three, day 2
  | 'LIGHT_GREEN_BABY_3' // Count of three, day 3
  | 'YELLOW'; // Shown in the welcome guide only

export interface Observation {
  id: string;
  date: string; // YYYY-MM-DD
  cycleDay: number;
  bleeding?: BleedingCode | undefined;
  stretch?: MucusStretch | undefined;
  modifiers?: MucusModifier[] | undefined;
  frequency?: FrequencyCode | undefined;
  symptoms?: SymptomCode[] | undefined;
  intercourse?: boolean | undefined;
  notes?: string | undefined;
  isManualPeak?: boolean | undefined;
  isCycleStart?: boolean | undefined;
  stamp: StampType;
  codeString: string; // For example "10KLX3 I"
  isPeakDay?: boolean | undefined;
}

export type ObservationInput = { [K in keyof Observation]?: Observation[K] | undefined };

export interface Cycle {
  id: string;
  startDate: string; // YYYY-MM-DD
  observations: Observation[];
  notes?: string | undefined;
}

export type Language = 'en' | 'fr';
export type Theme = 'dark' | 'light';
export type ActiveTab = 'today' | 'chart' | 'calendar' | 'analytics';
```

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
