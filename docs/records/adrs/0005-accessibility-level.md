# ADR 0005: Accessibility level of the screens

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

The application has a text contrast rule, but no general accessibility level for its screens. Which level must each screen meet?

## Decision drivers

- The application gives health information. All users must be able to read and use it.
- The level must be a standard that a test or a review can verify.

## Options

- WCAG 2.2 level AA.
- WCAG 2.2 level AAA.
- No general level.

## Decision

Each screen must meet WCAG 2.2 level AA. The **Accessibility** section of each screen page gives the rules of that screen.

### Consequences

- Good: one known level for all the screens.
- Good: two current rules map to it. The text contrast rule of `SPEC.md` 7.3 is success criterion 1.4.3, and the stamp edge rule is 1.4.11. The project did not audit the other criteria. Thus, level AA is a target, not a result.
- Bad: some criteria need a manual review. An automatic test cannot verify all of them.

### Confirmation

The token contrast test verifies criteria 1.4.3 and 1.4.11 for the tokens. The accessibility tests in `e2e/` run axe with the tags `wcag2a` and `wcag2aa`. Thus, they verify WCAG 2.0 levels A and AA only. The criteria of WCAG 2.1 and 2.2, for example 2.5.8 (target size), need a manual review of each screen change. This stays true until the tests also run the tags `wcag21a`, `wcag21aa` and `wcag22aa`.

## Advantages and disadvantages of the options

### WCAG 2.2 level AA

- Good: the usual level for public applications.

### WCAG 2.2 level AAA

- Bad: AAA adds criterion 1.4.6, a text contrast of 7:1. The text on the colored stamps uses the colors of the Creighton chart, and the project does not change these colors.

### No general level

- Bad: each screen can have a different level.

## More information

- [RFC 0001: Documentation structure, records and screen frames](../rfcs/0001-documentation-structure.md), section "Screen pages"
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
