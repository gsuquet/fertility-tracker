# ADR 0009: Chart density and 44 px desktop columns

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

On a phone, the chart shows about 6 days under 330 px of controls. On a desktop, the narrow cells cut long codes, and in **All Cycles** the rows do not align by cycle day. How does the chart show more days and keep each code readable?

## Decision drivers

- The chart must be the main part of the Chart page.
- A code must stay readable at 11 px or more.
- The cycles must align by cycle day, as on the paper chart.

## Options

- 44 px columns on a desktop, with day cards of 44 × 116 px on a phone.
- 35 narrow columns that fit 1440 px.

## Decision

The chart controls use one row. The phone day cards are 44 × 116 px. The desktop columns are 44 px, so 28 days fit at 1440 px and 35 days fit from 1600 px. A code breaks only between its tokens. All the rows share one scroll position. The reason is that 35 narrow columns cut a code of 6 characters in the middle of a token.

### Consequences

- Good: two cycles fit in one phone screen, and the cycles align by cycle day.
- Good: a code of 6 characters fits at 11 px.
- Bad: at 1440 px, days 29 to 35 need a scroll.

### Confirmation

The tests of step 3 of RFC 0002 check the shared scroll position and the token break of the codes.

## Advantages and disadvantages of the options

### 44 px columns

- Good: no code is cut in a token.
- Bad: the 35 days need 1600 px.

### 35 narrow columns

- Good: no scroll at 1440 px.
- Bad: a code of 6 characters is cut in the middle of a token.

## More information

- [RFC 0002: Phone-first redesign of the screens](../rfcs/0002-phone-first-redesign.md), section Chart
- [Issue #115](https://github.com/gsuquet/fertility-tracker/issues/115) and [pull request #116](https://github.com/gsuquet/fertility-tracker/pull/116)
