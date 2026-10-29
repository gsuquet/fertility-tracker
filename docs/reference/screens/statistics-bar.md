# Statistics bar

This page gives the rules for the four statistics cards above the pages.

## Behavior

The bar shows four cards for the selected cycle, or for all cycles:

| Card                  | One cycle                                    | All cycles                                                         |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Cycle Length          | Number of observations                       | Average number of observations per cycle (`stats.averageDays`)     |
| Estimated Peak Day    | Cycle day and date of the Peak Day, or `---` | The Peak Day of the newest cycle that has one, or `---`            |
| Luteal Phase Count    | Days after the Peak Day                      | Average of the cycles with a Peak Day. Without a Peak Day: 0 days. |
| Intercourse Frequency | Days with `I`                                | Days with `I` in all cycles                                        |

On a screen of 768 pixels or less, the bar shows only on the **Cycle Analytics** page.

## Accessibility

- The bar has no role, name or focus rule of its own. Each card is text.

## Implementation

- [src/components/CycleStatsHeader.tsx](../../../src/components/CycleStatsHeader.tsx)

## Related documents

- [Application behavior](../application-behavior.md)
- [User interface](../user-interface.md)
