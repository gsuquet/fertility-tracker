# Shared chart mode

This page gives the rules for the shared chart mode of a partner device. A partner device is a reader member of a vault ([ADR 0012](../../records/adrs/0012-encrypted-sync-and-partner-sharing.md#partner-devices)).

## When the mode is on

| Condition                                                                  | Result                                                          |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `fertility_care_shared_chart` holds a list that `parseVaultDays()` accepts | The mode is on. The pages show the days of this list.           |
| **Else**                                                                   | The mode is off. The pages show the observations of the device. |

- Only `readShared()` writes `fertility_care_shared_chart`, on a reader device ([Sync client](../sync-client.md#shared-chart)). **Stop viewing** and **Turn off sync on this device** delete it.
- After a failed read, the key stays. Thus, a removed partner keeps the chart that the device already shows.
- The own observations of the device stay in `fertility_care_observations`. The mode does not change or show them. They come back after **Stop viewing**.

## Data of the pages

`useSync()` gives the days of the shared chart as `sharedDays` ([Sync control](../sync-client.md#sync-control)). `useSharedCycleData(sharedDays)` in [CycleContext.tsx](../../../src/context/CycleContext.tsx) makes the data of the pages from them:

- Each day gets the id `shared_<date>`. The device calculates the cycle day, the stamp, the code and the Peak Day again, as after a sync.
- The selected cycle is the newest cycle until the user selects a cycle.
- `saveObservation()` and `deleteObservation()` do nothing. `readOnly` is `true`.
- The other fields, for example the backup dates, are those of the device.

`CycleDataOverride` gives this data to these parts. The other parts, for example Settings, the backup reminder and **Undo**, use the observations of the device.

- The header, with its cycle picker
- The statistics bar and the four pages
- The observation drawer and the **+** button of the phone
- The export dialog and the print view

## Read-only pages

While `readOnly` is `true`, no part of the pages changes a day:

| Part                                                                 | Change                                                                                                                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Today](today.md)                                                    | The fields of the form are disabled. The notes show in full, as text. The Save bar and the actions menu do not show.                                                   |
| [Observation drawer](observation-drawer.md)                          | The title is "Observation". The date and the fields are disabled. The notes show in full, as text. The actions menu and **Save** do not show. **Cancel** is **Close**. |
| The **+** button of the phone ([Navigation](navigation.md))          | It does not show.                                                                                                                                                      |
| The day bar of the [chart](chart.md) and the [calendar](calendar.md) | **Edit** does not show.                                                                                                                                                |
| The **Log Observation** shortcut of the app icon                     | It opens Today, and does not open the drawer.                                                                                                                          |
| **Else**                                                             | No change. For example, the export dialog prints the shared chart.                                                                                                     |

Above the pages, a note (`role="note"`) shows the text "This is the shared chart. You can read it, but you cannot change it."

## Related documents

- [ADR 0012: End-to-end encrypted sync and partner sharing](../../records/adrs/0012-encrypted-sync-and-partner-sharing.md)
- [Sync client](../sync-client.md)
- [Settings](settings.md)
