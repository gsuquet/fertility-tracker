# ADR 0004: Specification in reference pages

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

`SPEC.md` has more than 1,300 lines. It mixes facts, reasons and procedures, and many facts are also in `docs/reference/`. How does the project keep the spec-first rule, with each rule in one place only?

## Decision drivers

- Spec first: a contributor changes the specification before the code.
- Each rule is in one place only.
- A contributor or a coding agent finds the rule of a source file fast.
- All the pages follow Diátaxis and ASD-STE100.

## Options

- Divide `SPEC.md` into Diátaxis reference pages. `SPEC.md` becomes an index.
- Keep `SPEC.md` as one file.

## Decision

The specification is the set of pages in `docs/reference/`. The pages of the other types are not the specification. `SPEC.md` becomes an index with a table that gives the page of each source folder or file.

These rules apply:

- One reference page for each screen and dialog, in `docs/reference/screens/`. The screen pages are for contributors. `reference/user-interface.md` stays as the overview for users, with no copied rules.
- A rule with a condition uses a table with the columns **Condition** and **Result**. The rows apply in sequence, the last row is **Else**, and each value has a number and a unit.
- From step 3 of RFC 0001, the docs check reads the text of the table cells for the STE rules.
- The pull request that moves a section replaces it in `SPEC.md` with a link. A code comment refers to the path of a page, not to a section number.
- The pages have no document version. The version of the application is the history.

### Consequences

- Good: each rule is in one place.
- Good: smaller pages that an agent can read fast.
- Bad: many links and code comments change during the move.
- Bad: a reader cannot read all the specification in one file.

### Confirmation

The docs check finds broken links. From step 3 of RFC 0001, it also finds STE errors in the table cells. The review of each pull request of the move verifies that `SPEC.md` has no second copy of a moved rule.

## Advantages and disadvantages of the options

### Diátaxis reference pages

- Good: one page type for each page, and no duplicate facts.
- Bad: a large move in many pull requests.

### One file

- Good: no move.
- Bad: the duplicate facts stay, and the file becomes larger.

## More information

- [RFC 0001: Documentation structure, records and screen frames](../rfcs/0001-documentation-structure.md), sections "Split of SPEC.md", "Transition", "Screen pages" and "Rules for behavior"
- The frames of the screens are not decided. Read unresolved question 1 of RFC 0001.
