# Sync rules

This page gives the rules of the sync engine: the canonical day, the clocks, the merge, the Peak Day rule and the conflicts. [ADR 0012](../records/adrs/0012-encrypted-sync-and-partner-sharing.md) gives the design and the reasons.

**Source folder:** [src/domain/sync/](../../src/domain/sync/)

The engine has no network code and no storage code. A vault store adapter reads and writes the vault content. The relay and the encryption come in step 3 of the ADR plan. Until then, the application does not call the engine.

## Files

| File              | Content                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| `canonical.ts`    | `SyncDay`, `toSyncDay()`, `sameDay()`                                           |
| `clock.ts`        | `Clock`, `zeroClock()`, `compareClocks()`, `nextClock()`, `receiveClock()`      |
| `vaultContent.ts` | `VaultDay`, `parseVaultDays()`, `serializeVaultDays()`, `toObservationInputs()` |
| `localChanges.ts` | `stampLocalChanges()`, `firstSyncDays()`                                        |
| `cycles.ts`       | `cycleOfDates()`: the cycle of each date, from `groupObservationsIntoCycles()`  |
| `merge.ts`        | `mergeDays()`, `SyncConflict`, `addConflicts()`                                 |
| `engine.ts`       | `SyncState`, `VaultStore`, `newSyncState()`, `syncOnce()`, `dropBase()`         |

## Canonical form of a day

`toSyncDay(observation)` keeps only the fields that sync. The other fields stay on the device. `isManualPeak` is not in a `SyncDay`, because it has its own clock.

| Field                                                | Canonical form                                        |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `modifiers`, `symptoms`                              | Sorted, without duplicates. An empty array is absent. |
| `intercourse`                                        | `true` stays. `false` is absent.                      |
| `isCycleStart`                                       | `true` and `false` stay. Absent stays absent.         |
| `notes`                                              | An empty text is absent.                              |
| `bleeding`, `stretch`, `frequency`                   | The code stays. A missing code is absent.             |
| `id`, `cycleDay`, `stamp`, `codeString`, `isPeakDay` | Absent. Each device calculates them again.            |

- `sameDay(a, b)` compares two canonical days. `null` is a deleted day or a missing day. Two `null` values are the same.
- A day whose `id` starts with `demo_` is not a day of the vault. `stampLocalChanges()` and `firstSyncDays()` ignore it.

## Clocks

A clock is a hybrid logical clock: `time` in milliseconds, a `counter` and the `member` id.

| Function                  | Result                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `zeroClock(member)`       | Time 0 and counter 0. A day of a first sync gets it.                                    |
| `compareClocks(a, b)`     | Compares the time, then the counter, then the member id. A missing clock is the lowest. |
| `nextClock(last, now)`    | A clock that is later than `last` and has a time of at least `now`.                     |
| `receiveClock(last, all)` | The latest of `last` and all the clocks in `all`, with the member of `last`.            |

When `now` is the same as the time of `last`, or earlier, `nextClock()` keeps the time of `last` and adds 1 to the counter. Else, it uses `now` and counter 0.

## Vault content

The vault content is a JSON array of `VaultDay` objects, one for each date, sorted by date:

| Field   | Content                                                                        |
| ------- | ------------------------------------------------------------------------------ |
| `date`  | `YYYY-MM-DD`                                                                   |
| `day`   | The canonical day without `date`, or `null` for a deleted day (a tombstone)    |
| `clock` | The clock of the last change of `day`                                          |
| `peak`  | Optional. `{ "value": true or false, "clock": clock }` for the manual Peak Day |

- `parseVaultDays(value)` gives the days, or `null` when one item is not valid. Each code must be in its code list, each date must be valid and the dates must be different. The time and the counter of a clock are whole numbers of 0 or more. Its member id has 1 to 64 characters.
- `serializeVaultDays(days)` gives the JSON text with the days sorted by date and the fields in a fixed sequence. Two equal contents give the same text.
- `toObservationInputs(days)` gives one observation input for each day that is not deleted. `isManualPeak` is `true` only when the `peak` value is `true`.

## Local changes

`stampLocalChanges(observations, previous, last, now)` compares the observations with the days of the previous comparison. It gives the new days and the last clock.

| Condition                                    | Result                                        |
| -------------------------------------------- | --------------------------------------------- |
| The canonical day is the same as before      | The day keeps its clock.                      |
| The canonical day changed, or the day is new | The day gets a new clock from `nextClock()`.  |
| The date is gone from the observations       | The day becomes a tombstone with a new clock. |
| The date was a tombstone and is still gone   | The tombstone keeps its clock.                |

The manual Peak Day of each date has its own comparison:

| Condition                                                                             | Result                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| The date gains the manual Peak Day                                                    | The `peak` value becomes `true` with a new clock.            |
| The date loses it, and a different date of the same cycle gains it in this comparison | The `peak` value becomes `false`. The clock does not change. |
| The date loses it in a different way                                                  | The `peak` value becomes `false` with a new clock.           |
| **Else**                                                                              | The `peak` does not change.                                  |

A deleted day loses its manual Peak Day. `firstSyncDays(observations, member)` gives all the days and all the manual Peak Days with `zeroClock(member)`.

## Merge

`mergeDays(local, base, remote)` merges each date. `base` is the vault content of the last merge, or `null` before the first merge. The comparison uses only the canonical day, not the clock. A missing date is the same as a tombstone.

| Condition                                               | Result                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| Local and remote are the same as the base               | The entry with the later clock stays. No change.               |
| Only local is different from the base                   | The local entry stays.                                         |
| Only remote is different from the base                  | The remote entry replaces the local entry.                     |
| Local and remote are different from the base, and equal | The entry with the later clock stays. No conflict.             |
| **Else**                                                | The later clock wins. The other version goes to the conflicts. |

- A local clock with time 0 loses to the remote clock. Thus, on a first sync, the vault wins on each date, also over the zero clock of a different member.
- The `peak` of each date merges by its own clock: the later clock wins, with the same rule for time 0. When the two clocks are equal, `false` wins.
- After the merge, a cycle with two or more manual Peak Days keeps the one with the later `peak` clock. When the clocks are equal, the later date stays. The other dates get the `peak` value `false`, with their clock.
- The cycles come from `groupObservationsIntoCycles()` on the days that are not deleted.
- The result gives the merged days, the conflicts, the dates that changed on the device and the dates that the merge deletes on the device.

A conflict (`SyncConflict`) has the date, the losing day or `null` for a losing deletion, and its clock. `addConflicts(list, added)` keeps one conflict for each date: the new one replaces the old one. The list is sorted by date.

## Sync

`syncOnce(input)` does one sync with a vault store. A vault store has two functions:

| Function            | Result                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `read()`            | The vault days and their ETag, or `null` when the vault has no content.                     |
| `write(days, etag)` | The new ETag. `null` when the vault changed after the read, as the HTTP answer `412` tells. |

The sync state (`SyncState`) has the member id, the last clock, the days of the last comparison (`local`) and the base.

| Condition                          | Result                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `recoveryData` is set              | Status `skipped`. The engine does not read the vault.                                                   |
| `saveFailed` is true               | Status `skipped`. The engine does not read the vault.                                                   |
| The observations key is missing    | The engine drops the base and the local days. The vault days replace the local days. No day is deleted. |
| The merge deletes more than 7 days | The engine calls `confirmDeletions(dates)`. A `false` answer gives the status `cancelled` and no write. |
| **Else**                           | Normal sync                                                                                             |

In a normal sync:

1. The engine calls `stampLocalChanges()`. Thus, a change saved just before the sync gets its clock.
2. It reads the vault and merges.
3. When the merged days are different from the vault days, it writes them with the ETag of the read. Else, it does not write.
4. When the write gives `null`, it reads, merges and writes again. After 5 attempts, the status is `busy`.
5. The status is `synced`. The result gives the new state, the observation inputs, the conflicts and `changed`.

`changed` is `true` when the merge changes a day or a manual Peak Day on the device. The engine does not write to the browser storage. The application saves the observations first. It saves the new state only after that save succeeds.

`newSyncState(member, observations)` gives the state of a device that joins a vault. Its days come from `firstSyncDays()`, and it has no base.

`dropBase(state, observations)` removes the base and gives the days of `firstSyncDays()` to the state. The application calls it at load when `parseObservationData()` gives `null` or `droppedCount` is more than 0. Thus, the next sync is a first sync, and the vault wins on each date.

## Related documents

- [ADR 0012: End-to-end encrypted sync and partner sharing](../records/adrs/0012-encrypted-sync-and-partner-sharing.md)
- [Data format](data-format.md)
- [Data storage](data-storage.md)
- [Cycle and phase rules](cycle-and-phase-rules.md)
