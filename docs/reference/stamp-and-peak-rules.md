# Stamp and Peak Day rules

This page gives the rules that set the stamp of each day and the Peak Day of each cycle. The rules are in `src/domain/stampCalculator.ts` and `src/domain/peakDetector.ts`.

## Stamps

| Stamp                | Color and symbol           | Meaning                                                    |
| -------------------- | -------------------------- | ---------------------------------------------------------- |
| `RED`                | Red                        | Bleeding                                                   |
| `DARK_GREEN`         | Green                      | Dry day, no fertile mucus                                  |
| `WHITE_BABY`         | White with a baby          | Fertile mucus                                              |
| `LIGHT_GREEN_BABY_1` | Light green with a baby, 1 | First day of the count of three                            |
| `LIGHT_GREEN_BABY_2` | Light green with a baby, 2 | Second day of the count of three                           |
| `LIGHT_GREEN_BABY_3` | Light green with a baby, 3 | Third day of the count of three                            |
| `YELLOW`             | Yellow                     | Shown in the welcome guide only. No rule gives this stamp. |

## Stamp of one day

The application uses the first rule that applies:

1. If the day has fertile mucus, the stamp is `WHITE_BABY`. Read [Observation codes](observation-codes.md) for the fertile codes.
2. If the bleeding code is `H`, `M`, `L` or `VL`, the stamp is `RED`.
3. If the bleeding code is `B` and the stretch code is `0` or not set, the stamp is `RED`.
4. In all other conditions, the stamp is `DARK_GREEN`.

## Peak Day

Each cycle has a maximum of one Peak Day. The application uses the first rule that applies:

1. If a day of the cycle has a Peak Day that you set, that day is the Peak Day.
2. If not, the last day of the cycle with fertile mucus is the Peak Day.
3. If the cycle has no day with fertile mucus, the cycle has no Peak Day.

The Peak Day can change when you record more days. A new day with fertile mucus moves the Peak Day to that day.

You can set one Peak Day in each cycle. When you save a new Peak Day, the application removes the old Peak Day of that cycle. The Peak Days that you set in other cycles do not change.

## Count of three

After each run of fertile days, the three subsequent calendar days are the count of three. The Peak Day is also a fertile day for this rule.

| Calendar days after the last fertile day | Stamp if the day is dry |
| ---------------------------------------- | ----------------------- |
| 1                                        | `LIGHT_GREEN_BABY_1`    |
| 2                                        | `LIGHT_GREEN_BABY_2`    |
| 3                                        | `LIGHT_GREEN_BABY_3`    |
| 4 or more                                | `DARK_GREEN`            |

These rules apply to the count of three:

- The count uses calendar days. A day without an observation is part of the count.
- The count applies before and after the Peak Day.
- A new day with fertile mucus starts the count again.
- Only a day with the `DARK_GREEN` stamp changes. A `RED` day stays red.
- A `WHITE_BABY` day after a Peak Day that you set stays white.

## Example

| Day | Code     | Stamp                | Peak Day |
| --- | -------- | -------------------- | -------- |
| 1   | `M`      | `RED`                |          |
| 2   | `10KLAD` | `WHITE_BABY`         | Yes      |
| 3   | `0AD`    | `LIGHT_GREEN_BABY_1` |          |
| 4   | `0AD`    | `LIGHT_GREEN_BABY_2` |          |
| 5   | `0AD`    | `LIGHT_GREEN_BABY_3` |          |
| 6   | `0AD`    | `DARK_GREEN`         |          |

## Related documents

- [Cycle and phase rules](cycle-and-phase-rules.md)
- [The Creighton Model in this application](../explanation/creighton-model.md)
