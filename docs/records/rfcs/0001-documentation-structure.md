# RFC 0001: Documentation structure, records and screen frames

- **Start date:** 2026-10-28
- **Status:** Accepted
- **Author:** Gabriel
- **Pull request:** [#100](https://github.com/gsuquet/fertility-tracker/pull/100)

## Summary

This RFC divides `SPEC.md` into Diátaxis reference pages and keeps the spec-first rule. It puts the proposals and the decision records in `docs/records/`. It adds one reference page for each screen. The text frames of the layout wait for a decision (unresolved question 1). All the pages stay in ASD-STE100 Simplified Technical English.

## Motivation

The project wants to work on the user experience, the visual design and the functions of all the application. The current documentation has no correct place for this work.

These are the problems of the current state:

1. **No place for a proposal.** An ADR records a decision. The project has no format for a large change that needs discussion first. An example is a new design of all the screens.
2. **No layout of the screens.** Section 5 of `SPEC.md` gives the parts of each screen in tables and text. It does not show where each part is on the screen.
3. **The same facts are in two places.** Section 5 of `SPEC.md` and `docs/reference/user-interface.md` describe the same screens. Sections 3 and 4 have the same problem with the method pages and `docs/reference/data-format.md`. Two copies can give different facts.
4. **One very large file.** `SPEC.md` has more than 1,300 lines. A contributor or a coding agent must read all of it to find one rule.
5. **A mix of page types.** `SPEC.md` has reference facts, reasons and procedures on one page. The project uses a strict form of Diátaxis for all the other pages.

## Guide-level explanation

### Change a behavior

A contributor wants to change the export dialog. They open `docs/reference/screens/export-dialog.md`. They change the rules on that page first, and the frame when the project uses frames (unresolved question 1). Then they write a test that fails and change the code. The same pull request has the page, the test and the code.

The rule "change the specification before the code" stays. The specification is now the set of reference pages, not one file.

### Propose a large change

A contributor wants a new navigation for all the screens. They copy `docs/records/rfcs/0000-template.md` to a new file with the next number. They write the proposal, with the frames of the new screens. They open a pull request with the title `docs(rfc): ...` and set the status to **Proposed**.

The maintainer and the contributors discuss the pull request. At the end, the maintainer sets the status to **Accepted** or **Rejected** and merges the RFC. The project merges a rejected RFC too, so that the reasons stay in the repository. Then the work starts in other pull requests. Each of these pull requests copies the accepted frames into the reference pages, together with the code.

### Record a decision

A contributor selects a library or a technical approach. They write an ADR in `docs/records/adrs/` with the [MADR](https://adr.github.io/madr/) template. An ADR is short. It gives the context, the options, the decision and the consequences.

## Reference-level explanation

### Folders

```text
docs/
├── README.md                 # Index of all pages
├── tutorials/
├── how-to/
├── reference/
│   ├── screens/              # One page for each screen and dialog, with frames
│   └── ...                   # Domain rules, data, storage, languages, design system
├── explanation/
└── records/
    ├── rfcs/                 # Proposals: 0000-template.md, 0001-..., 0002-...
    └── adrs/                 # Decisions: 0000-template.md, 0001-..., 0002-...
```

The current ADR 0001 and ADR 0002 move to `docs/records/adrs/`. They keep their numbers and their text, because a record does not change after the merge. Only new ADRs use MADR.

### RFC and ADR

| Property         | RFC                                                  | ADR                                                         |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| When to write it | A large change that needs discussion before the work | One decision, with its context and options                  |
| Template         | Rust RFC template                                    | MADR                                                        |
| Page type        | A record. It is not a Diátaxis page.                 | A record. It is not a Diátaxis page.                        |
| After the merge  | The text does not change. The status can change.     | The text does not change. A new ADR can replace an old ADR. |

When the project accepts an RFC, the author writes a short ADR for each decision in the RFC. The ADR links to the RFC in its **More information** section. Thus, a reader finds all the decisions in `records/adrs/`.

The two series have different numbers that both start at 0001. A reference to a record always has its prefix, for example "RFC 0001" or "ADR 0002", never "0001" alone.

The status is only in the header of the record. The index in `docs/README.md` does not show it. These are the status values of an RFC:

| Status    | Meaning                                                 | Set by                                          |
| --------- | ------------------------------------------------------- | ----------------------------------------------- |
| Draft     | The author writes the RFC. The pull request is a draft. | The author                                      |
| Proposed  | The RFC is ready for discussion.                        | The author                                      |
| Accepted  | The project does the work of the RFC.                   | The maintainer                                  |
| Rejected  | The project does not do the work.                       | The maintainer                                  |
| Withdrawn | The author stops the RFC before a decision.             | The author                                      |
| Completed | All the steps of the work are merged.                   | The author of the last pull request of the work |

These are the status values of an ADR: **Proposed**, **Accepted**, **Deprecated** and **Superseded**. They come from MADR.

### Decision on an RFC

1. The maintainer writes the decision, **Accepted** or **Rejected**, in a comment on the pull request of the RFC.
2. The author pushes a commit that sets this status in the header of the RFC.
3. The maintainer merges the pull request. Each RFC is merged, also a rejected RFC, so that its reasons stay in the repository.

A coding agent never sets **Accepted** or **Rejected** without a written decision of the maintainer. A coding agent never merges an RFC pull request without this decision. This rule applies also when the review is clean and CI passes.

This pull request adds the `records/` folders, the RFC template and the change to the docs check before the decision. If the maintainer rejects RFC 0001, these parts stay, because they let the project discuss the next RFC.

### Split of SPEC.md

Each section of `SPEC.md` moves to one or more reference pages. A reason or a background text moves to an explanation page.

| Section of SPEC.md                           | New page                                                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Summary                                   | `docs/README.md` and `explanation/architecture.md`                                                                                                                    |
| 2. Architecture and technology               | `reference/technology.md` and `reference/project-structure.md`. The reasons go to `explanation/architecture.md`.                                                      |
| 3.1 to 3.6 Domain rules                      | `reference/observation-codes.md`, `reference/stamp-and-peak-rules.md`, `reference/cycle-and-phase-rules.md`                                                           |
| 3.2 Code parser                              | `reference/domain-api.md`                                                                                                                                             |
| 3.7 Version tracker                          | `reference/version-tracker.md`                                                                                                                                        |
| 4. Data types                                | `reference/data-format.md`                                                                                                                                            |
| 5.1 Navigation and dialogs                   | `reference/screens/navigation.md` for the header, the bottom navigation and the footer. `reference/dialog-component.md` for `Modal.tsx`.                              |
| 5.2 to 5.11 Screens and dialogs              | `reference/screens/*.md`, one page for each screen and dialog                                                                                                         |
| 5.12 to 5.18 Behavior of all the application | `reference/application-behavior.md`: installed application, install and update, keyboard shortcuts, page slide, app icon badge, haptic feedback and desktop title bar |
| 6. State and data storage                    | `reference/data-storage.md`                                                                                                                                           |
| 7. Languages and design system               | `reference/languages.md` and `reference/design-system.md`                                                                                                             |
| 8.1 to 8.3 Coverage and tests                | `reference/test-rules.md`                                                                                                                                             |
| 8.4 Commands                                 | `reference/commands.md`                                                                                                                                               |
| 8.5 Documentation                            | `reference/documentation-rules.md`                                                                                                                                    |
| 8.6 Commit messages                          | `reference/commit-messages.md`                                                                                                                                        |
| 9. Deployment and CI                         | `reference/deployment.md`                                                                                                                                             |
| 10. Privacy, trademarks, medical             | `reference/legal-and-medical-limits.md`. The reasons stay in `explanation/privacy-and-data-storage.md`.                                                               |

The pages in the right column that exist now get the facts of `SPEC.md`. Thus, each rule is in one place only.

`SPEC.md` stays as a short index page. It says that the specification is the set of reference pages, and it links to each page. It also has a table that gives the page of each source folder and of each source file that has no folder page. A contributor or a coding agent uses this table to find the page to change before the code.

A link to the file `SPEC.md` stays correct after the split. A reference to a section number does not stay correct:

- The code comments refer to sections, for example `src/App.tsx` (SPEC 5.15), `src/styles/views/page-transition.css` (SPEC 5.15), `src/components/AppBadgeSetting.tsx` (SPEC 5.16) and `src/domain/keyboardShortcuts.ts` (SPEC 5.14). The docs check does not read code comments.
- `SPEC.md` has 62 links to its own headings, for example the link of `5.12` to the heading `back-button-and-address`. Each one becomes a link to another page. The docs check finds each broken link.

After the split, a code comment refers to the path of the page, for example `docs/reference/screens/today.md`, not to a section number. The pull request that moves a section changes the comments that refer to it.

### Transition

Step 3 has many pull requests. The pull request that moves a section also replaces that section in `SPEC.md` with a link to the new page. Thus, `SPEC.md` never has a second copy of a rule.

A pull request of step 3 changes the docs and the code comments only. It does not change the behavior of the application. Thus, it does not need a new version.

### Version of the specification

The pages do not have a document version. The version of the application in `package.json` and the release notes in `src/domain/versionTracker.ts` are the history. The project removes step 6 of [Release a new version](../../how-to/release-a-new-version.md).

### Screen pages

The screen pages are for contributors. `reference/user-interface.md` stays as the overview for users. It gives the names, the locations and the actions of the buttons, and it links to the screen pages. It does not copy a rule from a screen page.

All the pages in `reference/` are the specification. The pages of the other types are not. Thus, a page does not need a line that marks it as part of the specification.

Each page in `reference/screens/` has the reference template and these sections. Sections 1 and 2 wait for the decision on frames (unresolved question 1).

1. **Layout**: one frame for a phone screen and one frame for a wide screen.
2. **Zones**: a table with one row for each number in the frames.
3. **Behavior**: the rules of the screen, for example gestures, keys and messages.
4. **Accessibility**: roles, names and focus rules. Each screen must meet WCAG 2.2 level AA.
5. **Implementation**: the source files of the screen.
6. **Related documents**: links. Always link to `reference/application-behavior.md`. Link to `reference/dialog-component.md` when the screen opens a dialog.

### Frame format

A frame is a text drawing in a `text` code block. It shows the position of each zone, not the colors or the exact sizes.

| Rule                 | Value                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Characters           | Box-drawing characters: `┌ ┐ └ ┘ ─ │ ├ ┤ ┬ ┴ ┼`                                                      |
| Symbols              | `▾`, `⋮`, `‹`, `›`, `·` and `\|`. Any other symbol uses a name in angle brackets, for example `<+>`. |
| Width of a phone     | 40 characters, for a phone screen of 390 pixels. One column is about 10 pixels.                      |
| Width of a wide view | 100 characters                                                                                       |
| Zone label           | A number in square brackets, for example `[3]`. The zones table explains it.                         |
| Text in the frame    | The English text of the screen, from `src/i18n/locales/en.ts`                                        |
| Part with no text    | A name in angle brackets, for example `<logo>` or `<code buttons>`                                   |
| Sizes                | In the zones table, in pixels or CSS units. Not in the frame.                                        |

A frame does not show line wrap. A frame shows the English text only. When a text can wrap or overflow, also in French, the zones table gives the behavior.

This is an example of the phone frame of the **Today** screen. It shows the format only. It does not change the current layout.

```text
┌──────────────────────────────────────┐
│ [1] <logo>  [2] All Cycles ▾       ⋮ │
├──────────────────────────────────────┤
│ [3] ‹  <date picker>  ›              │
│     Wednesday, October 28, 2026      │
│     Today · Day 12 · <status>        │
├──────────────────────────────────────┤
│ [4] <stamp> <code> <guidance text>   │
├──────────────────────────────────────┤
│ [5] Direct Code Only | Detailed Form │
│     <code buttons>                   │
│     I - Sexual Intercourse           │
│     Designate Peak Day (P)           │
│     <notes>                          │
│     Save Observation    Delete Entry │
├──────────────────────────────────────┤
│ [6] Recent 5-Day Observation History │
├──────────────────────────────────────┤
│ [7]                                  │
│ Today Chart <+> Calendar Analytics   │
└──────────────────────────────────────┘
```

| Zone | Name              | Content                                                                                           |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------- |
| 1    | Header            | Logo and menu button (`⋮`). The buttons are 38 pixels high.                                       |
| 2    | Cycle picker      | Opens the cycle menu as a bottom sheet.                                                           |
| 3    | Date bar          | Previous day, date picker, next day, the date, and the status of the date.                        |
| 4    | Guidance          | Stamp preview, code and guidance text, as a banner.                                               |
| 5    | Form              | The observation form. **Delete Entry** shows only when the date has an observation.               |
| 6    | History           | The selected date and the 4 days before it.                                                       |
| 7    | Bottom navigation | Fixed at the bottom of the screen. `<+>` is the **+** button, which opens the observation drawer. |

### Rules for behavior

A rule uses "must" for a requirement and "can" for something that is possible, as the STE rules of the project say. The project does not use the other keywords of RFC 2119, because STE does not approve them.

A rule with a condition uses a table with the columns **Condition** and **Result**. This format is almost the same as the Given, When and Then steps of Gherkin. These rules apply to each table:

- The rows apply in sequence. The first row with a true condition gives the result.
- The rows cover all the conditions. The last row is **Else**.
- Each value has a number and a unit. Do not use words such as "slowly" or "fast".
- Each row gives one test.

This example is the rule of `SPEC.md` 5.7 for the release of a bottom sheet:

| Condition                                                                                                   | Result                               |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| The drag is more than 25% of the sheet height.                                                              | The sheet closes.                    |
| The speed down is 0.5 pixels per millisecond or more, over 24 pixels or more, in the last 100 milliseconds. | The sheet closes.                    |
| Else                                                                                                        | The sheet goes back to its position. |

### STE in tables

After the split, most of the rules are in tables. Thus, the docs check also reads the text of each table cell. It applies the 25-word limit and the list of words that are not approved. It does not read a cell in code format or a frame in a `text` code block. These contain code and the real text of the screen.

### Documentation rules and docs check

These pages change:

- [Documentation rules](../../reference/documentation-rules.md): add the records, the screen page template and the frame rules.
- [Write documentation](../../how-to/write-documentation.md): add the procedures for an RFC and an ADR.
- [Why the docs use STE and Diátaxis](../../explanation/documentation-approach.md): add why the records are not Diátaxis pages.
- `AGENTS.md`: change step 1 to "change the reference page before the code". Remove the `SPEC.md` version from step 4.
- `.agents/rules/spec_and_version_workflow.md` and `.gemini/rules/spec_and_version.md`: the same changes as `AGENTS.md`.
- [Release a new version](../../how-to/release-a-new-version.md): change step 1 and remove step 6.
- [Write a test first](../../how-to/write-a-test-first.md), [Commit messages](../../reference/commit-messages.md) and [Project structure](../../reference/project-structure.md): change the links to `SPEC.md` and the tree of `docs/`.
- Section 8.5 of `SPEC.md`: add the records. This pull request adds this change.
- `scripts/docs/checkDocs.ts`: accept pages in `records/rfcs/` and `records/adrs/`. This pull request adds this change.
- `scripts/docs/checkDocs.ts`: read the table cells (step 3), and check the frames (step 4).
- The code comments that refer to a section of `SPEC.md`: refer to the path of the page (step 3).

### Steps of the work

Each step is one pull request:

1. This RFC, the RFC template and the change to the docs check.
2. Move the ADRs to `docs/records/adrs/` and add the MADR template. Change section 8.5 of `SPEC.md` and `reference/project-structure.md`. Remove `adr` from the folders that the docs check accepts, and change its message.
3. Let the docs check read the table cells, and correct the findings. Then move the sections of `SPEC.md` to the reference pages, one group of sections in each pull request. Each pull request replaces the moved section with a link, and changes the code comments that refer to it.
4. Let the docs check verify the frames. Each line of a frame has 40 or 100 characters. Each `[n]` in a frame has a row in the zones table, and the reverse. Then add the frames of the current screens to `reference/screens/`.
5. Make `SPEC.md` an index page with the table of source files. Change `AGENTS.md`, the two agent rule files, the release procedure and the pages that link to `SPEC.md`.

## Drawbacks

- The move changes many links. The docs check finds each broken link, but the work is large.
- A reader cannot read all the specification in one file. The index in `SPEC.md` and `docs/README.md` makes this problem smaller.
- A text frame cannot show colors, sizes or motion. The zones table and the design system page give these facts.
- Box-drawing characters are difficult to type. A contributor can copy a frame and change it.
- The specification has no document version. The version of the application replaces it.

## Rationale and alternatives

### Keep SPEC.md as one file and add frames to it

This is the smallest change. It keeps one source of facts for contributors. But the two copies of the facts stay, and the file becomes larger. It also keeps a page that does not follow Diátaxis.

### A separate `docs/design/` folder

This folder holds one page for each screen. It is outside Diátaxis, and the docs check must accept a fifth type. A frame describes what the screen is, so it is a reference fact.

### A design tool, for example Figma or Penpot

A design tool shows colors and sizes. But its files are not text. A pull request cannot show the difference between two versions, and a coding agent cannot read the file. The project can use a design tool to try ideas, but the frame in the reference page is the specification.

### Images of the screens

The command `mise run screenshots` makes images of the current screens. An image shows the result, but it cannot show a new layout before the code exists. A reference page can link to an image as an addition to the frame.

### Mermaid diagrams

GitHub shows Mermaid diagrams. They are good for the flow between screens, but they cannot show the layout of one screen. A screen page can use Mermaid for a flow.

### No change

The design work starts without a place for proposals and without frames. The decisions go into pull request comments, and the project loses them.

## Prior art

- [Rust RFCs](https://github.com/rust-lang/rfcs): the RFC template and the process of discussion in a pull request.
- [Python PEPs](https://peps.python.org/pep-0001/) and [Kubernetes KEPs](https://github.com/kubernetes/enhancements): status values for a proposal.
- [MADR](https://adr.github.io/madr/): the template for decision records.
- [Diátaxis](https://diataxis.fr/): the four page types.
- [ASD-STE100](https://www.asd-ste100.org/): the controlled language of the docs.
- [Gherkin](https://cucumber.io/docs/gherkin/reference/): the Given, When and Then form of a behavior rule.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): level AA for each screen. The text contrast rule of `SPEC.md` 7.3 is success criterion 1.4.3, and the stamp edge rule is 1.4.11.

## Unresolved questions

1. Does the project use frames? The maintainer did not decide this part of the RFC. Until the decision, a screen page has no **Layout** and no **Zones** sections, and step 4 does not start. The rules for frames in this RFC apply only after a decision to use them.
2. What keeps the text in a frame equal to `src/i18n/locales/en.ts`? When a label changes, no check fails. One option is a docs check that finds each text of a frame in `en.ts`. The other option is to accept the difference and correct the frame when the screen changes.

The discussion of this RFC answered these questions:

- ADR 0001 and ADR 0002 keep their text. Read [Folders](#folders).
- A screen page does not need a line that marks it as the specification. All the pages in `reference/` are the specification. Read [Screen pages](#screen-pages).
- `reference/user-interface.md` stays as the overview for users, with no copied rules. Read [Screen pages](#screen-pages).
- The docs check verifies the width of the frames and the zone numbers. Read [Steps of the work](#steps-of-the-work).
- Each screen must meet WCAG 2.2 level AA. Read [Screen pages](#screen-pages).

## Future possibilities

- RFC 0002: the user experience and the screen design of all the application. For example, all the dialogs open as bottom sheets on a phone and close with a drag down.
- C4 diagrams for `explanation/architecture.md`.
- Design tokens in the [W3C Design Tokens](https://www.designtokens.org/) format, as one source for `src/styles/tokens/`.
- An accessibility checklist for each screen page.
