# Monthly Calendar page

This page gives the rules for the **Monthly Calendar** page.

## Behavior

- The grid shows one month. Each day shows its stamp, its code and the intercourse mark.
- A click on a day opens the observation drawer for that date. Days after today are disabled.
- The next-month button is disabled in the current month. Thus, the user cannot go to a month after the current month.
- Text uses the theme tokens `--text-primary` and `--text-secondary`. Thus, it is readable in the dark theme.
- On a phone, a long code goes onto more lines and the day cell becomes taller. The code is never cut.

### Swipe between months

On a touch screen, a swipe on the calendar changes the month. It uses the hook of the **Today** page, [useDaySwipe.ts](../../../src/hooks/useDaySwipe.ts), with the same rules ([Today page](today.md#swipe-between-days)), and these differences:

- A swipe to the left opens the next month. A swipe to the right opens the previous month. The swipe calls the same functions as the arrow buttons.
- In the current month, a swipe to the left does nothing, as the disabled next-month button. The grid goes back, and the click after the swipe is blocked.
- The days grid follows the finger and slides. The header with the month name and the buttons stays in place.
- The calendar has `touch-action: pan-y pinch-zoom`. Thus, a vertical drag scrolls the page and never changes the month.

## Accessibility

- Today (`.calendar-day.is-today`) has a 2-pixel accent border, an `--accent-soft` background, a round day number and `aria-current="date"`. The date of today comes from `getTodayStr()`.

## Implementation

- [src/components/CalendarGrid.tsx](../../../src/components/CalendarGrid.tsx)

## Related documents

- [Application behavior](../application-behavior.md)
- [User interface](../user-interface.md)
