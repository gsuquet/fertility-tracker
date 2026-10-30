# Statistics bar

This page gives the rules for the four statistics tiles of the **Cycle Analytics** page.

## Layout

This part shows on the **Cycle Analytics** page only (RFC 0002). Its layout is in the screenshots and the ARIA snapshots of [Analytics](analytics.md#layout).

## Behavior

The bar shows four tiles for the selected cycle, or for all cycles. Each tile has a label, a value with its unit, and one line of detail. The label is complete: it goes onto two lines when it is long.

| Tile         | One cycle: value                                  | One cycle: detail       | All cycles: value                             | All cycles: detail  |
| ------------ | ------------------------------------------------- | ----------------------- | --------------------------------------------- | ------------------- |
| Cycle length | The [length](../cycle-and-phase-rules.md) in days | The first and last date | The average length                            | Average of N cycles |
| Peak Day     | `CD` and the cycle day of the Peak Day            | The date                | The Peak Day of the newest cycle that has one | Latest: the date    |
| Luteal phase | The days after the Peak Day                       | After Peak Day          | The average of the cycles with a Peak Day     | Average of N cycles |
| Intercourse  | The days with `I`                                 | In this cycle           | The days with `I` in all cycles               | In all cycles       |
- Without a Peak Day, the Peak Day tile shows `---` and **Not yet**, and the luteal phase tile shows `---`.
- An average is a whole number, or a number with one decimal. The decimal sign is the sign of the language, for example "28,5" in French.
- The unit and "Average of N cycles" use the singular when the language does, for example "1 day" and "Average of 1 cycle".
- A cycle of one day shows only one date.
- The bar is a list with the name **Cycle statistics**. Each tile is a list item.
- On a phone, the tiles are in 2 rows of 2. From 768 pixels, they are in 1 row of 4.

## Accessibility

- The bar is a list with a name. The tiles have no focus. Each tile is text.

## Implementation

- [src/components/CycleStatsHeader.tsx](../../../src/components/CycleStatsHeader.tsx)

## Related documents

- [Application behavior](../application-behavior.md)
- [User interface](../user-interface.md)
