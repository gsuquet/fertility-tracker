# Paper Chart Strip page

This page gives the rules for the **Paper Chart Strip** page.

## Behavior

| Part                                                                           | Content                                                                                                    |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [ChartToolbar.tsx](../../../src/components/chart/ChartToolbar.tsx)             | Title, grid mode, phase bar and legend buttons. An empty chart shows only the title and the legend button. |
| [ChartLegend.tsx](../../../src/components/chart/ChartLegend.tsx)               | The stamp legend.                                                                                          |
| [ChartBlankGrid.tsx](../../../src/components/chart/ChartBlankGrid.tsx)         | A 35-day grid before the first observation, from today. Each cell opens a new observation.                 |
| [ChartCycleRow.tsx](../../../src/components/chart/ChartCycleRow.tsx)           | One cycle: number, dates, length, Peak Day, scroll and jump buttons, phase bar and cells.                  |
| [ChartPhaseTimeline.tsx](../../../src/components/chart/ChartPhaseTimeline.tsx) | The phase bar above the cells of a cycle.                                                                  |
| [ChartCell.tsx](../../../src/components/chart/ChartCell.tsx)                   | A filled cell, an empty day cell or a blank grid cell. Each cell is a native `<button type="button">`.     |
| [ChartCellPopover.tsx](../../../src/components/chart/ChartCellPopover.tsx)     | Details of a filled cell: code, bleeding, stretch, modifiers, intercourse and notes.                       |
- Each cycle is one row, in the format of the CrMS paper chart. **Full 35-Day Paper Grid** shows a minimum of 35 cells. A longer cycle adds cells in groups of 7. **Compact Strip** shows only the recorded days.
- Each cell shows the cycle day, the date, the stamp, the code, the symptom tag, the `I` mark and the `P` mark.
- Buttons go to day 1, to the Peak Day and to the newest day of each row. Each row has its own scroll area.
- When the chart opens, the row of the current cycle shows today near the middle of its scroll area. Late in the cycle, the row stops at its end. The current cycle is the newest cycle, when today is on or after its start date.
  - If today has no cell, the row opens at its end. For example, today is after the last cell of the grid, or has no observation in **Compact Strip**.
  - The row sets `scrollLeft` at once, before the browser paints. There is no smooth scroll, and the page does not scroll vertically.
  - A change of the grid mode puts today in view again.
  - The rows of past cycles open at day 1.
- A click, `Enter` or `Space` on a cell opens the observation drawer. The user sets or removes the manual Peak Day there with **Designate Peak Day (P)**.
- The details show when the mouse is on a filled cell or when the cell has the focus. Each cell has its own hover state, so a hover does not render other cells again.
- Two details can show at the same time: one on the cell with the focus and one under the mouse.

## Accessibility

- Today has a 2-pixel accent border, a `TODAY` label (`.cell-today-pill`) and `aria-current="date"`. This applies to filled cells and empty cells. The date of today comes from `getTodayStr()`.

## Implementation

- [src/components/ChartRow.tsx](../../../src/components/ChartRow.tsx)

## Related documents

- [Application behavior](../application-behavior.md)
- [Dialog component](../dialog-component.md)
- [User interface](../user-interface.md)
