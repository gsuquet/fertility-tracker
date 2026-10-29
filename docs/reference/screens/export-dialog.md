# Export dialog

This page gives the rules for the export dialog (**Share chart**): the print of the chart.

## Layout

The test `e2e/screenLayout.spec.ts` compares the ARIA snapshots with the screen, with the demo data. Read [ADR 0006](../../records/adrs/0006-screen-layout-snapshots-and-screenshots.md).

| Size                     | Screenshot                                                | ARIA snapshot                                                          |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Phone, 390 by 844 pixels | [export-dialog-phone.png](images/export-dialog-phone.png) | [export-dialog-phone.aria.yml](snapshots/export-dialog-phone.aria.yml) |
| Wide, 1440 by 900 pixels | [export-dialog-wide.png](images/export-dialog-wide.png)   | [export-dialog-wide.aria.yml](snapshots/export-dialog-wide.aria.yml)   |

![The export dialog on a phone](images/export-dialog-phone.png)

## Behavior

The dialog has the title **Share chart**. It holds only the print of the chart. Backup, restore, demo data and the delete of all data are in [Settings](settings.md).

These buttons open the dialog:

- **Share chart** in the **Chart options** menu (`⋮`) of the chart page, after **Phase bar** and **Legend** ([Paper Chart Strip page](chart.md)).
- The export icon button of the header on a wide screen ([Navigation](navigation.md)).

| Action                  | Result                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| **Single Cycle**        | Prints one cycle, with the cycle of **Select Cycle**.                  |
| **Multiple Cycles**     | Prints the selected cycles.                                            |
| **Print / Save as PDF** | Prints one cycle or the selected cycles with the browser print dialog. |

Each opening starts in **Single Cycle** mode, with the cycle of the cycle picker.

`getExportFilename()` makes file names with only lowercase letters, digits and dashes. There is no PNG export. Step 5b of RFC 0002 adds **Download PNG** and changes the dialog to a sheet.

### Print

The print view is a lazy chunk. The rules of its load are in [Code splitting and lazy loading](../technology.md#code-splitting-and-lazy-loading).

1. The dialog names the selection: `cycle-N`, `selected-cycles` or `all-cycles`.
2. The application sets the document title to the file name, for example `fertility-tracker-chart-cycle-1-YYYY-MM-DD`.
3. The application calls `window.print()`. The browser uses the title as the default PDF file name.
4. The application restores the title one second later. A second print in that second restores the first title.
5. The application closes the dialog. It shows the success message when the user clicks, before the print starts. The message closes 3.5 seconds after the last print.

When the application unmounts, it stops the title and message timers.

The print layout:

- It is landscape, with 35 days in each row. It hides the user interface.
- It does not show the day of the week. It removes the spaces from the codes and lets a long code go onto two lines.
- It has a line under the code of each day for the notes.
- Without cycles, it shows one empty cycle that starts today (`getTodayStr()`).
- It uses the language of the interface: `printExport.*`, `chartStrip.*` and `t.locale` for the export date. The CrMS codes and the stamp colors are the same in each language.
- The date of each cell uses `common.monthDay`: `MM-DD` in English and `DD/MM` in French.
- Each legend label is one text: `chartStrip.legendMenses`, `legendDry`, `legendFertile`, `legendPostPeak` and `legendPeakDay`. The chart legend uses the same texts.

## Accessibility

- The [dialog component](../dialog-component.md) gives the name, the focus trap and the focus return. The name is the title **Share chart**.
- On a phone, the dialog is a bottom sheet. The user can drag it down to close it ([Drag down to close](observation-drawer.md#drag-down-to-close)).

## Implementation

- [ExportModal.tsx](../../../src/components/ExportModal.tsx)
- [PrintExportView.tsx](../../../src/components/PrintExportView.tsx)
- [exportUtils.ts](../../../src/utils/exportUtils.ts)

## Related documents

- [Settings](settings.md)
- [Application behavior](../application-behavior.md)
- [Dialog component](../dialog-component.md)
- [User interface](../user-interface.md)
