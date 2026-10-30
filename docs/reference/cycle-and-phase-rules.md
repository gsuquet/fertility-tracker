# Cycle and phase rules

This page gives the rules that put days into cycles and calculate the phases. The rules are in `src/domain/cycleBoundaryDetector.ts` and `src/domain/cyclePhases.ts`.

## Start of a cycle

The first observation always starts a cycle. For each subsequent day, the first row that matches applies:

| Condition                                                                            | Result                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| You answered **Yes, Start New Cycle** for the day (`isCycleStart` is `true`).        | The day starts a new cycle.                                              |
| You answered **No, Continue Current Cycle** for the day (`isCycleStart` is `false`). | The day stays in the current cycle, for example spotting between cycles. |
| The day has `H`, `M`, `L` or `VL`, and the previous day has no bleeding or has `B`.  | The day starts a new cycle.                                              |
| Else                                                                                 | The day stays in the current cycle.                                      |

## Cycle start question

The form asks "Is this bleeding day the start of a new cycle?" when `needsCycleStartChoice` in `src/domain/observationForm.ts` is `true`. All these conditions must be true:

- The day has a bleeding code: `H`, `M`, `L`, `VL` or `B`.
- The previous observation has no bleeding, or there is no previous observation.
- You did not answer for this day before (`isCycleStart` is not set).

## Cycle identifiers

The `id` of a cycle is `cycle_` and its start date. `groupObservationsIntoCycles` gives the cycles from the newest to the oldest.

## Cycle day

Cycle day 1 is the first day of the cycle. The cycle day of each subsequent day is the number of calendar days from day 1, plus 1. A day without an observation is part of the count.

`getCycleDayOn` gives the cycle day of a date that has no observation. It uses the last cycle that starts on or before the date. It gives no cycle day for a date before the first cycle.

## Cycle numbers

The oldest cycle is cycle 1. The cycle picker and the paper chart show the newest cycle first.

## Phases of one cycle

| Value  | Rule                                                 |
| ------ | ---------------------------------------------------- |
| Length | The cycle day of the last observation.               |
| Luteal | The days after the Peak Day. Before the Peak Day: 0. |

## Phases of all cycles

The **All Cycles** view shows the average of each value per cycle.

The length average uses all the cycles. The luteal average uses these cycles:

| Condition                        | Result                                |
| -------------------------------- | ------------------------------------- |
| One cycle or more has a Peak Day | Only the cycles that have a Peak Day. |
| **Else**                         | All the cycles.                       |

## Phase bar of Analytics

The **Cycle phases** bar of the **Cycle Analytics** page splits the calendar days of the cycle into four phases. The source is `getPhaseSegments()` in `src/domain/cyclePhases.ts`.

| Phase           | Days                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------ |
| Menses          | The observations up to the Peak Day with the `RED` stamp or a bleeding code.               |
| Before Peak Day | The other cycle days up to the Peak Day, and the Peak Day. A missing day is in this phase. |
| Post-Peak count | The first 3 cycle days after the Peak Day. A cycle without a Peak Day has no count.        |
| After the count | The cycle days after the count.                                                            |

The four phases add up to the length. The count and the days after it add up to the luteal phase.

The **All Cycles** view shows the average of each phase per cycle (`averageSegments()`). The menses average uses all the cycles. The other averages use the same cycles as the luteal average.

## Luteal phase health

The newest cycle is in progress, so its luteal phase is not complete. The **Clinical summary** judges only the cycles that have ended and have a Peak Day. The **All Cycles** view judges the average of these cycles.

| Condition                                       | Result                     |
| ----------------------------------------------- | -------------------------- |
| No ended cycle with a Peak Day, and a Peak Day  | Cycle in progress          |
| No ended cycle with a Peak Day, and no Peak Day | Pending Peak Day           |
| Luteal phase from 9 to 17 days                  | Normal (9 to 17 days)      |
| **Else**                                        | Short or long luteal phase |

## Mucus score

The **Cycle Analytics** page gives each day a mucus score from 0 to 10. The average mucus score is the mean of the scores of all the days in the selection. The source is `getMucusScore` in `src/domain/mucusScore.ts`.

| Observation                                                      | Score |
| ---------------------------------------------------------------- | ----- |
| Stretch `10`, `10DL`, `10SL` or `10WL`, or appearance `K` or `L` | 10    |
| Stretch `8`                                                      | 8     |
| Stretch `6`                                                      | 6     |
| Stretch `4`                                                      | 4     |
| Stretch `2` or `2W`                                              | 2     |
| All other days                                                   | 0     |

The appearance code `C/K` alone does not give the score 10. This is different from the Peak-type mucus rule, which includes `C/K`.

## Related documents

- [Stamp and Peak Day rules](stamp-and-peak-rules.md)
- [Start a new cycle](../how-to/start-a-new-cycle.md)
