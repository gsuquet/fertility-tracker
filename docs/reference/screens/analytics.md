# Cycle Analytics page

This page gives the rules for the **Cycle Analytics** page.

## Layout

The test `e2e/screenLayout.spec.ts` compares the ARIA snapshots with the screen, with the demo data. Read [ADR 0006](../../records/adrs/0006-screen-layout-snapshots-and-screenshots.md).

| Size                     | Screenshot                                        | ARIA snapshot                                                  |
| ------------------------ | ------------------------------------------------- | -------------------------------------------------------------- |
| Phone, 390 by 844 pixels | [analytics-phone.png](images/analytics-phone.png) | [analytics-phone.aria.yml](snapshots/analytics-phone.aria.yml) |
| Wide, 1440 by 900 pixels | [analytics-wide.png](images/analytics-wide.png)   | [analytics-wide.aria.yml](snapshots/analytics-wide.aria.yml)   |

![The Cycle Analytics page on a phone](images/analytics-phone.png)

## Behavior

The [statistics tiles](statistics-bar.md) are above the page. The page then shows these cards, in this order. On a phone, they are in one column. From 768 pixels, **Cycle phases** and **Mucus score trend** are at the left. **Stamps in this cycle** and **Clinical summary** are at the right. The explanation is under them.

| Card                               | Content                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cycle phases                       | One bar with the days of the four phases of the [phase bar](../cycle-and-phase-rules.md#phase-bar-of-analytics), and a legend. A phase with 0 days is not in the bar.                       |
| Mucus score trend                  | One bar for each day, with its [mucus score](../cycle-and-phase-rules.md#mucus-score). Dry bars are dark green, fertile bars (score 6 or more) use the accent and the Peak Day bar is pink. |
| Stamps in this cycle               | For each kind of stamp: bleeding, dry, fertile mucus and Post-Peak count, the number of days and a bar.                                                                                     |
| Clinical summary                   | The average mucus score and the [luteal phase health](../cycle-and-phase-rules.md#luteal-phase-health). It does not repeat the values of the tiles.                                         |
| What is the Creighton Mucus Score? | The explanation of the score. It is closed when the page opens.                                                                                                                             |
- Without a Peak Day, **Cycle phases** shows "No Peak Day yet. The count starts after the Peak Day."
- In the **All Cycles** view, **Cycle phases** shows the average of each phase. The stamps card is **Stamps in all cycles**. The trend shows one row for each cycle, with the cycle number and its first date.
- A trend bar is 8 pixels wide with a gap of 1 pixel, so 35 days fit on a phone. Its height is 10 % for each point of the score, and at least 2 pixels. The axis under the bars names day 1 and each fifth day.
- The value of a phase is a whole number, or a number with one decimal.
- Without observations, the page shows an empty state with `id="analytics-panel"`.

## Accessibility

- The phase bar is an image (`role="img"`). Its name gives each phase and its days, for example "Menses: 4 days, Before Peak Day: 9 days".
- The trend chart (`.mucus-trend-wrapper`) scrolls horizontally when a cycle is longer than the card. It is a `<section>` with `tabIndex={0}` and `aria-labelledby` (role `region`).
- The button of the explanation has `aria-expanded` and `aria-controls`.
- The clinical summary is a description list.

## Implementation

- [src/components/CycleAnalyticsView.tsx](../../../src/components/CycleAnalyticsView.tsx)

## Related documents

- [Cycle and phase rules](../cycle-and-phase-rules.md)
- [Application behavior](../application-behavior.md)
- [User interface](../user-interface.md)
