# ADR 0006: Screen layout in ARIA snapshots and screenshots

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

RFC 0001 proposed text frames for the layout of each screen, but left this part as unresolved question 1. A text frame is a drawing that a person writes. No test compares it with the screen, so it becomes wrong when the screen changes. How does a screen page show the layout of the screen, and how does the project keep it correct?

## Decision drivers

- The layout on a screen page must be the same as the real screen.
- A pull request must show the change of a layout as a text difference.
- A coding agent must be able to read the layout.
- A proposal for a new screen must show the layout before the code exists.

## Options

- Text frames with box-drawing characters and a zones table, as in RFC 0001.
- ARIA snapshots that a test checks, and screenshots of the real screens.
- Screenshots only.

## Decision

The project uses ARIA snapshots and screenshots, not text frames. A test compares each snapshot with the real screen, and a screenshot shows the result.

These rules apply:

- The screen page of each page and each dialog has an ARIA snapshot for a phone screen and one for a wide screen. The phone screen is 390 by 844 pixels. The wide screen is 1440 by 900 pixels.
- The navigation and the statistics bar are parts of each page. Their layout is in the snapshots of the pages. The error screen has no snapshot, because the test cannot make a part fail.
- An end-to-end test opens each screen with the demo data and compares its accessibility tree with the snapshot, with `toMatchAriaSnapshot`. The snapshot files are in `docs/reference/screens/snapshots/`.
- The command `mise run screenshots` also makes a screenshot of each screen in the two sizes, with the demo data. The screenshots are in `docs/reference/screens/images/`.
- The **Layout** section of a screen page shows the two screenshots and links to the two snapshots. The page has no **Zones** section.
- An RFC for a new design shows the new screens in a static HTML mockup. The mockup uses the real CSS tokens of `src/styles/tokens/`. It is in the folder of the RFC, for example `docs/records/rfcs/0002-assets/`.
- The docs check does not check frames. The width and zone rules of RFC 0001 do not apply.

### Consequences

- Good: a test fails when the structure or the text of a screen changes, and the snapshot is not updated. This answers unresolved question 2 of RFC 0001.
- Good: a snapshot is YAML text. A pull request shows the difference, and a coding agent can read it.
- Good: a screenshot shows the colors, the sizes and the real position of each part.
- Bad: a snapshot does not show the position of a part. The screenshot gives the position, but no test checks the screenshot.
- Bad: the screenshots are binary files. Each update adds to the size of the repository.
- Bad: a contributor must update the snapshots when a change of a screen is correct. The command is `npx playwright test --update-snapshots`.

### Confirmation

The end-to-end job of CI runs the snapshot test. The review of a pull request that changes a screen verifies that the screenshots are new.

## Advantages and disadvantages of the options

### Text frames

- Good: a frame shows the position of each part as text.
- Bad: no test compares a frame with the screen.
- Bad: box-drawing characters are difficult to type.

### ARIA snapshots and screenshots

- Good: a test keeps the snapshot equal to the screen.
- Good: the same snapshot shows the roles and the names that the accessibility rules need.
- Bad: two files for each screen and size.

### Screenshots only

- Good: one file for each screen and size.
- Bad: a pull request cannot show the difference as text, and a coding agent reads an image less well.

## More information

- [RFC 0001: Documentation structure, records and screen frames](../rfcs/0001-documentation-structure.md), unresolved questions 1 and 2, and step 4 of the work
- [ADR 0005: Accessibility level of the screens](0005-accessibility-level.md)
- [Playwright ARIA snapshots](https://playwright.dev/docs/aria-snapshots)
