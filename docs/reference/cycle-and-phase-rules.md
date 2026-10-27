# Cycle and phase rules

This page gives the rules that put days into cycles and calculate the phases. The rules are in `src/domain/cycleBoundaryDetector.ts` and `src/domain/cyclePhases.ts`.

## Start of a cycle

The first observation always starts a cycle. For each subsequent day, the application uses the first rule that applies:

1. If you answered **Yes, Start New Cycle** for the day, the day starts a new cycle.
2. If you answered **No, Continue Current Cycle** for the day, the day stays in the current cycle.
3. A day with `H`, `M`, `L` or `VL` starts a new cycle after a day without bleeding or with `B`.
4. In all other conditions, the day stays in the current cycle.

## Cycle day

Cycle day 1 is the first day of the cycle. The cycle day of each subsequent day is the number of calendar days from day 1, plus 1. A day without an observation is part of the count.

## Cycle numbers

The oldest cycle is cycle 1. The cycle picker and the paper chart show the newest cycle first.

## Phases of one cycle

| Value      | Rule                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
| Length     | The cycle day of the last observation.                                                   |
| Menses     | The number of days with the `RED` stamp.                                                 |
| Follicular | Cycle day 1 to the Peak Day. Before the Peak Day: all days so far, marked "in progress". |
| Luteal     | The days after the Peak Day. Before the Peak Day: 0.                                     |

## Phases of all cycles

The **All Cycles** view shows the average of each value per cycle.

- The length and menses averages use all the cycles.
- The follicular and luteal averages use only the cycles that have a Peak Day.
- If no cycle has a Peak Day, the follicular and luteal averages use all the cycles.

## Luteal phase health

| Luteal phase                      | Label                       |
| --------------------------------- | --------------------------- |
| 9 to 17 days                      | Normal (9-17 days)          |
| 1 to 8 days, or more than 17 days | Short/Extended luteal phase |
| 0 days                            | Pending Peak Day            |

## Mucus score

The **Cycle Analytics** page gives each day a mucus score from 0 to 10. The average mucus score is the mean of the scores of all the days in the selection.

| Observation                                                      | Score |
| ---------------------------------------------------------------- | ----- |
| Stretch `10`, `10DL`, `10SL` or `10WL`, or appearance `K` or `L` | 10    |
| Stretch `8`                                                      | 8     |
| Stretch `6`                                                      | 6     |
| Stretch `4`                                                      | 4     |
| Stretch `2` or `2W`                                              | 2     |
| All other days                                                   | 0     |

## Related documents

- [Stamp and Peak Day rules](stamp-and-peak-rules.md)
- [Start a new cycle](../how-to/start-a-new-cycle.md)
