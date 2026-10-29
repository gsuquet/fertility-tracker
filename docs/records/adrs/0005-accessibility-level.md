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
- Good: the current rules agree with it. The text contrast rule of `SPEC.md` 7.3 is success criterion 1.4.3, and the stamp edge rule is 1.4.11.
- Bad: some criteria need a manual review. An automatic test cannot verify all of them.

### Confirmation

The token contrast test and the accessibility tests in `e2e/` verify a part of the criteria. The review of a screen change verifies the other criteria.

## Advantages and disadvantages of the options

### WCAG 2.2 level AA

- Good: the usual level for public applications.

### WCAG 2.2 level AAA

- Bad: some criteria are not possible for all content, for example the contrast of the stamp colors.

### No general level

- Bad: each screen can have a different level.

## More information

- [RFC 0001: Documentation structure, records and screen frames](../rfcs/0001-documentation-structure.md), section "Screen pages"
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
