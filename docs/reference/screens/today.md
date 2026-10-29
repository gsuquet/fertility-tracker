# Today page

This page gives the rules for the **Today** page: the date navigation, the observation form, the guidance and the history list.

## Layout

The test `e2e/screenLayout.spec.ts` compares the ARIA snapshots with the screen, with the demo data. Read [ADR 0006](../../records/adrs/0006-screen-layout-snapshots-and-screenshots.md).

| Size                     | Screenshot                                | ARIA snapshot                                          |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------ |
| Phone, 390 by 844 pixels | [today-phone.png](images/today-phone.png) | [today-phone.aria.yml](snapshots/today-phone.aria.yml) |
| Wide, 1440 by 900 pixels | [today-wide.png](images/today-wide.png)   | [today-wide.aria.yml](snapshots/today-wide.aria.yml)   |

![The Today page on a phone](images/today-phone.png)

## Behavior

| Part                                                                                                 | Content                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [TodayDateNav.tsx](../../../src/components/today/TodayDateNav.tsx)                                   | Previous and next day (44 px), date picker and date. The day status: **Today** or **Jump to Today**, the cycle day, and **Saved** or **Not saved**. On a phone, the day buttons and the short date are in the top bar, and the day status stays in the page.                                                      |
| [ProgressiveObservationForm.tsx](../../../src/components/observation/ProgressiveObservationForm.tsx) | The progressive observation form ([Observation form](#observation-form)). The drawer uses the same component ([Observation drawer](observation-drawer.md)).                                                                                                                                                       |
| [ObservationActionsMenu.tsx](../../../src/components/observation/ObservationActionsMenu.tsx)         | The ⋮ menu of the status card: **Copy yesterday**, **Direct Code Only** and **Delete observation**.                                                                                                                                                                                                               |
| [TodayFertilityGuidance.tsx](../../../src/components/today/TodayFertilityGuidance.tsx)               | The status card: stamp, code, one guidance sentence and the ⋮ menu. A banner on a screen of 900 pixels or less, else a card. The drawer uses the banner at each width, without the menu. A day with no code shows the empty stamp and "No observation yet", and no guidance text.                                 |
| [TodayHistoryList.tsx](../../../src/components/today/TodayHistoryList.tsx)                           | The selected date and the 4 days before it, in three columns: date, stamp and code. A day with no observation, or with no code and the `DARK_GREEN` stamp, shows the empty stamp ([Day with no code](../stamp-and-peak-rules.md#day-with-no-code)). A click selects that date. A long code ends with an ellipsis. |
- The day status shows **Yesterday**, **N days ago**, **Tomorrow** or **In N days** for a day that is not today.
- **Ctrl+S** or **⌘S** saves the form, also from a field. A dialog on top of the page keeps these keys.
- On a computer (`pointer: fine`), **Done** does not show. It closes the keyboard of a touch screen.
- The cycle day of the day status comes from the saved observation. A day with no observation gets the cycle day from the start date of the last cycle that starts on or before that day. A day before the first cycle or after today shows no cycle day.

### Observation form

The form of the **Today** page and of the observation drawer is the same component. It shows these parts, in this sequence:

1. The direct code field (48 px). While the field has the focus, it shows **Done** and how the app reads the code.
2. One row for each code group: **Bleeding**, **Mucus**, **Appearance**, **Frequency** and **Symptoms**. A closed row shows the code and its short name, or **None**.
3. The **I - Sexual Intercourse** and **Designate Peak Day (P)** switches (`role="switch"`).
4. The **Notes** row. A tap opens a text area in the row.
5. The **Save Observation** button.

- A tap on a row opens the chips of that group and closes the other open group. A second tap closes the row.
- A chip is 48 px high and shows the code and a short name. The short name is 11 px on a phone and 12 px from 1024 pixels. Under the chips, the full name of the selected code shows.
- Three chips go on a line on a phone, and four on a screen of 1024 pixels or more. The form is 640 pixels wide or less.
- In the **Bleeding** group, a bleeding code shows the cycle start choice under the chips.
- A tap on a selected chip clears it.
- On a phone, the **Save Observation** button stays at the bottom of the screen, over the tab bar. On a touch screen, the button hides while the keyboard is open.

#### The ⋮ menu

| Item                   | Result                                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Copy yesterday**     | Copies the bleeding, mucus, appearance, frequency and symptom codes of the day before. It does not copy the `I` mark, the Peak Day, the notes or the cycle start. The form is not saved. |
| **Direct Code Only**   | A check item. It hides the group rows, and the list under the code field always shows. Today and the drawer share the choice. The device keeps it in `fertility_care_entry_mode`.        |
| **Delete observation** | Red, after a line. It shows only for a saved day.                                                                                                                                        |
- **Copy yesterday** is not available when the day before has no code. The item then shows no code.

### Day with no code

A day with no code is not a dry day. The word "Infertile" never shows without a code. Here, a code is a bleeding, mucus or frequency code. The `I` mark, the symptoms and the notes alone are not a code. `hasObservationCode` in `src/domain/stampCalculator.ts` gives the rule.

| Condition                                                                           | Result                                                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The form has no code: no saved observation, or only the `I` mark, symptoms or notes | The empty stamp (a dashed square with `--stamp-empty`), the text "No observation yet" and no guidance text. |
| The form has a code                                                                 | The stamp of the code, the code and the guidance text of the stamp.                                         |

### Swipe between days

On a touch screen, a swipe on the **Today** page changes the day. The hook [useDaySwipe.ts](../../../src/hooks/useDaySwipe.ts) uses Pointer Events of `touch` and `pen` type only. Thus, a mouse does not swipe, and the arrow buttons stay for the keyboard and the desktop.

- A swipe to the left opens the next day. A swipe to the right opens the previous day. The swipe calls the same functions as the arrow buttons, with the same rules.
- [swipe.ts](../../../src/domain/swipe.ts) decides at the release:
  - The angle of the swipe must be less than 30 degrees from horizontal.
  - The swipe must be longer than 60 pixels, or a fast flick: at least 0.5 pixels per millisecond over at least 24 pixels.
- The page has `touch-action: pan-y pinch-zoom`. Thus, a vertical drag scrolls the page and the browser cancels the swipe. A vertical drag never changes the day.
- These swipes do nothing:
  - A swipe that starts in an input, a text area, a select or an element that scrolls horizontally.
  - A swipe that starts on the chips of a group (`data-own-gesture`).
  - A swipe that starts less than 20 pixels from the left or right edge of the screen. The back and forward gestures of iOS use these edges.
  - A swipe that starts its move with an angle of 30 degrees or more from horizontal.
  - A swipe in a dialog of the page, for example **New Cycle Start?**. React sends the events of a portal to the page, so the hook ignores a target outside the page.
  - A swipe on a zoomed page. The page then has `touch-action: auto`, so that the finger can pan the zoomed page in all directions.
- After a swipe, the hook blocks the next click for 100 milliseconds. Thus, a swipe that starts on a button does not also press it. A tap that moves a little is not a swipe, so its click stays.
- A second swipe during the slide first applies the day change of the first swipe. Thus, two fast swipes move two days.
- During the swipe, the main grid follows the finger by 40% of the move. After a swipe, the grid slides out in the swipe direction in 150 milliseconds. Then the day changes, and the grid slides in from the other side. Else the grid goes back.
- With `prefers-reduced-motion: reduce`, the grid does not move. The day changes at the release.
- A save or a delete shows a message (`role="status"`). The message closes 3 seconds after the last save or delete. The page stops the timer when it unmounts.

## Accessibility

- A group row is a button with `aria-expanded` and `aria-controls`. When the row opens, the focus goes to the selected chip, else to the first chip.
- **Bleeding**, **Mucus** and **Frequency** are a `role="radiogroup"` of `role="radio"` chips with one tab stop. The arrow keys move to the next chip and select it.
- **Appearance** and **Symptoms** are a `role="group"` of toggle buttons with `aria-pressed`.
- The name of each chip is the full name of its code, for example "10 - Very stretchy (2.5cm+)".
- The ⋮ button has `aria-haspopup="menu"`. The menu is a `role="menu"`, and the up and down arrow keys move between its items. Escape, Back and a click outside close it.
- In the status card, the code and the guidance sentence have `aria-live="polite"`. Thus, a screen reader reads the new code and sentence. The ⋮ button is not in the live region.
- A selected radio chip clears with a tap, **Space** or **Enter**, as a toggle does. Thus, a group can go back to no code.

## Implementation

- [src/components/TodayView.tsx](../../../src/components/TodayView.tsx)

## Related documents

- [Dialog component](../dialog-component.md)
- [Application behavior](../application-behavior.md)
- [User interface](../user-interface.md)
