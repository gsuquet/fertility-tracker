# ADR 0008: Progressive observation form without pre-fill

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

The Today page shows the 30 code buttons of the five groups at the same time, and it is 3,091 px high on a phone. How does the form fit one phone screen without a loss of function?

## Decision drivers

- The full form must fit one phone screen.
- A new person must still learn the codes.
- A saved code must come from the observations of that day.
- A day with no observation must not look like a dry day.
- The direct code field must stay.

## Options

- One row for each group, and one open group at a time.
- A form in steps, with one group on each screen.
- The same form, filled in with the data of the day before.

## Decision

The form shows one row for each group. A tap opens the chips of one group, with the code over a short name. The form never fills in the data of the day before. **Copy yesterday** is an explicit action in the observation actions menu, with **Delete observation**.

A day with no observation shows a dashed empty stamp and the text "No observation yet". It shows no fertility text, and the word "Infertile" never shows without a code.

### Consequences

- Good: the form fits one screen, and the stamp stays in view.
- Good: a reflex save cannot copy a code that moves the Peak Day.
- Good: an empty day cannot look like an infertile day.
- Bad: a group that changes needs one more tap. A dry day takes 5 taps (3 now).

### Confirmation

The tests of step 2 of RFC 0002 check that the form opens empty and that **Copy yesterday** is the only copy action. The tests of step 1 check the empty stamp and its text.

## Advantages and disadvantages of the options

### One row for each group

- Good: one screen, and one tap only for a group that changes.
- Bad: one more tap for each group that changes.

### A form in steps

- Good: one group to read at a time.
- Bad: a tap also for each group that does not change.

### Fill in from the day before

- Good: fewer taps on a day like the day before.
- Bad: a reflex save can move the Peak Day and the count of three.

## More information

- [RFC 0002: Phone-first redesign of the screens](../rfcs/0002-phone-first-redesign.md), section Today
- [Issue #115](https://github.com/gsuquet/fertility-tracker/issues/115) and [pull request #116](https://github.com/gsuquet/fertility-tracker/pull/116)
