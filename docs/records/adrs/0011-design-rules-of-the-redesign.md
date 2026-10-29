# ADR 0011: Design system rules of the phone-first redesign

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

The screens use text of 8 to 10 px, controls smaller than 44 px and a red filled button next to the main button. The design system of ADR 0002 has no rule for these sizes. Which rules must each screen of the redesign obey?

## Decision drivers

- A person must read each text and tap each daily control on a phone.
- The rules must be tokens, so that a test can check them.
- A destructive action must not look like the main action.

## Options

- New tokens and written rules in the design system.
- Rules for each page, with no new tokens.

## Decision

The design system gets these rules:

- Screen text is 11 px or more on a phone and 12 px or more on a desktop. Chart and calendar cells use 11 px. The tokens `--font-size-3xs` and `--font-size-4xs` are for print only.
- A daily control is 44 px. A secondary icon is 36 px. Other controls are 32 px or more.
- Each screen has one filled accent button, plus the + button of the phone navigation. A danger action is red text or a red outline.

The new tokens are `--bg-hero`, `--stamp-empty`, `--control-size-lg`, `--control-size-md`, `--control-size-sm` and `--row-height`.

### Consequences

- Good: the text and control sizes come from tokens that a test can check.
- Good: the main action of each screen is clear.
- Bad: the stamp marks grow from 10 px to 11 px, so the stamps are fuller.

### Confirmation

The token contrast test checks the two new colors. The accessibility tests of RFC 0002 check the text and control sizes.

## Advantages and disadvantages of the options

### New tokens and written rules

- Good: one rule for all the pages, in the layers of ADR 0002.
- Bad: six more tokens to keep.

### Rules for each page

- Good: no change to the tokens.
- Bad: each page can use different sizes again.

## More information

- [RFC 0002: Phone-first redesign of the screens](../rfcs/0002-phone-first-redesign.md), section Design system rules
- [ADR 0002: CSS in cascade layers with a shared design system](0002-css-maintainability-design-system.md)
- [Issue #115](https://github.com/gsuquet/fertility-tracker/issues/115) and [pull request #116](https://github.com/gsuquet/fertility-tracker/pull/116)
