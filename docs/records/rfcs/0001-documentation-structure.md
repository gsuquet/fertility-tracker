# RFC 0001: Documentation structure, records and screen frames

- **Start date:** 2026-10-28
- **Status:** Proposed
- **Author:** Gabriel
- **Pull request:** [#100](https://github.com/gsuquet/fertility-tracker/pull/100)

## Summary

This RFC divides `SPEC.md` into Diátaxis reference pages and keeps the spec-first rule. It puts the proposals and the decision records in `docs/records/`. It adds one reference page for each screen, with text frames of the layout. All the pages stay in ASD-STE100 Simplified Technical English.

## Motivation

The project wants to work on the user experience, the visual design and the functions of all the application. The current documentation has no correct place for this work.

These are the problems of the current state:

1. **No place for a proposal.** An ADR records a decision. The project has no format for a large change that needs discussion first. An example is a new design of all the screens.
2. **No layout of the screens.** Section 5 of `SPEC.md` gives the parts of each screen in tables and text. It does not show where each part is on the screen.
3. **The same facts are in two places.** Section 5 of `SPEC.md` and `docs/reference/user-interface.md` describe the same screens. Sections 3 and 4 have the same problem with the method pages and `docs/reference/data-format.md`. Two copies can give different facts.
4. **One very large file.** `SPEC.md` has more than 1,100 lines. A contributor or a coding agent must read all of it to find one rule.
5. **A mix of page types.** `SPEC.md` has reference facts, reasons and procedures on one page. The project uses a strict form of Diátaxis for all the other pages.

## Guide-level explanation

### Change a behavior

A contributor wants to change the export dialog. They open `docs/reference/screens/export-dialog.md`. They change the frame and the rules on that page first. Then they write a test that fails and change the code. The same pull request has the page, the test and the code.

The rule "change the specification before the code" stays. The specification is now the set of reference pages, not one file.

### Propose a large change

A contributor wants a new navigation for all the screens. They copy `docs/records/rfcs/0000-template.md` to a new file with the next number. They write the proposal, with the frames of the new screens. They open a pull request with the title `docs(rfc): ...` and the status **Proposed**.

The maintainer and the contributors discuss the pull request. At the end, the maintainer sets the status to **Accepted** or **Rejected** and merges the RFC. Then the work starts in other pull requests. Each of these pull requests copies the accepted frames into the reference pages, together with the code.

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

The current ADR 0001 and ADR 0002 move to `docs/records/adrs/`. They keep their numbers and their text.

### RFC and ADR

| Property    | RFC                                                       | ADR                                                         |
| ----------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Use         | A large change that needs discussion before the work      | One decision, with its context and options                  |
| Template    | Rust RFC template                                         | MADR                                                        |
| Status      | Draft, Proposed, Accepted, Rejected, Withdrawn, Completed | Proposed, Accepted, Deprecated, Superseded                  |
| Page type   | A record. It is not a Diátaxis page.                      | A record. It is not a Diátaxis page.                        |
| After merge | The text does not change, but the status can change.      | The text does not change. A new ADR can replace an old ADR. |

An accepted RFC can contain a decision. In that case, the project does not write an ADR for the same decision.

An RFC has a status in the project, not an approval date in a tool. The maintainer is the only person who sets **Accepted** or **Rejected**.

### Split of SPEC.md

Each section of `SPEC.md` moves to one or more reference pages. A reason or a background text moves to an explanation page.

| Section of SPEC.md               | New page                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1. Summary                       | `docs/README.md` and `explanation/architecture.md`                                                          |
| 2. Architecture and technology   | `reference/technology.md`. The reasons go to `explanation/architecture.md`.                                 |
| 3. Domain rules                  | `reference/observation-codes.md`, `reference/stamp-and-peak-rules.md`, `reference/cycle-and-phase-rules.md` |
| 3.7 Version tracker              | `reference/version-tracker.md`                                                                              |
| 4. Data types                    | `reference/data-format.md`                                                                                  |
| 5. User interface                | `reference/screens/*.md`, one page for each screen and dialog                                               |
| 5.1 Dialog component             | `reference/dialog-component.md`                                                                             |
| 6. State and data storage        | `reference/data-storage.md`                                                                                 |
| 7. Languages and design system   | `reference/languages.md` and `reference/design-system.md`                                                   |
| 8. Tests and quality             | `reference/test-rules.md`                                                                                   |
| 9. Deployment and CI             | `reference/deployment.md`                                                                                   |
| 10. Privacy, trademarks, medical | `reference/legal-and-medical-limits.md`. The reasons stay in `explanation/privacy-and-data-storage.md`.     |

The pages in the right column that exist now get the facts of `SPEC.md`. Thus, each fact is in one place only.

`SPEC.md` stays as a short index page. It tells that the specification is the set of reference pages, and it links to each page. The current links to `SPEC.md` from `README.md`, `AGENTS.md` and the code comments stay correct.

### Version of the specification

The pages do not have a document version. The version of the application in `package.json` and the release notes in `src/domain/versionTracker.ts` are the history. Step 6 of [Release a new version](../../how-to/release-a-new-version.md) is removed.

### Screen pages

Each page in `reference/screens/` has the reference template and these sections:

1. **Layout**: one frame for a phone screen and one frame for a wide screen.
2. **Zones**: a table with one row for each number in the frames.
3. **Behavior**: the rules of the screen, for example gestures, keys and messages.
4. **Accessibility**: roles, names and focus rules.
5. **Implementation**: the source files of the screen.
6. **Related documents**: links.

A user reads the first three sections. A contributor reads all the sections.

### Frame format

A frame is a text drawing in a `text` code block. It shows the position of each zone, not the colors or the exact sizes.

| Rule                 | Value                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| Characters           | Box-drawing characters: `┌ ┐ └ ┘ ─ │ ├ ┤ ┬ ┴ ┼`                              |
| Width of a phone     | 40 characters. This is a screen of 640 pixels or less.                       |
| Width of a wide view | 100 characters                                                               |
| Zone label           | A number in square brackets, for example `[3]`. The zones table explains it. |
| Text in the frame    | The English names of the screen, in the same words as the screen             |
| Sizes                | In the zones table, in pixels or CSS units. Not in the frame.                |

This is an example of the phone frame of the **Today** page. It is an example of the format only. It does not change the current layout.

```text
┌──────────────────────────────────────┐
│ [1] Logo     [2] All Cycles ▾    ⋮   │
├──────────────────────────────────────┤
│ [3]  ‹   Tuesday 28 October   ›      │
│      Today · Cycle day 12            │
├──────────────────────────────────────┤
│ [4] Stamp preview and guidance       │
├──────────────────────────────────────┤
│ [5] Direct Code Only | Detailed Form │
│     Code buttons                     │
│     Intercourse  Peak  Notes         │
│     [ Save Observation ]             │
├──────────────────────────────────────┤
│ [6] Last five days                   │
├──────────────────────────────────────┤
│ [7] Today Chart + Calendar Analytics │
└──────────────────────────────────────┘
```

| Zone | Name         | Content                                                   |
| ---- | ------------ | --------------------------------------------------------- |
| 1    | Header       | Logo and menu button. The header is 38 pixels high.       |
| 2    | Cycle picker | Opens the cycle menu as a bottom sheet.                   |
| 3    | Date bar     | Previous day, date, next day and the status of the date.  |
| 4    | Guidance     | Stamp preview, code and guidance text, as a banner.       |
| 5    | Form         | The observation form.                                     |
| 6    | History      | The selected date and the 4 days before it.               |
| 7    | Page buttons | Fixed at the bottom of the screen, with the **+** button. |

### Rules for behavior

A rule uses "must" for a requirement and "can" for a possibility, as the STE rules of the project tell. The project does not use the other keywords of RFC 2119, because STE does not approve them.

A rule with a condition uses a table with the columns **Condition** and **Result**. This format is near to the Given, When and Then steps of Gherkin. Each row gives one test.

| Condition                                       | Result                  |
| ----------------------------------------------- | ----------------------- |
| The user drags a bottom sheet down by 80 pixels | The sheet closes.       |
| The user drags a bottom sheet down by 20 pixels | The sheet goes back up. |

### Documentation rules and docs check

These pages change:

- [Documentation rules](../../reference/documentation-rules.md): add the records, the screen page template and the frame rules.
- [Write documentation](../../how-to/write-documentation.md): add the procedures for an RFC and an ADR.
- [Why the docs use STE and Diátaxis](../../explanation/documentation-approach.md): add why the records are not Diátaxis pages.
- `AGENTS.md`: change step 1 to "change the reference page before the code".
- `scripts/docs/checkDocs.ts`: accept pages in `records/rfcs/` and `records/adrs/`. This pull request adds this change.

### Steps of the work

Each step is one pull request:

1. This RFC, the RFC template and the change to the docs check.
2. Move the ADRs to `docs/records/adrs/` and add the MADR template.
3. Move the sections of `SPEC.md` to the reference pages, one group of sections in each pull request.
4. Add the frames of the current screens to `reference/screens/`.
5. Make `SPEC.md` an index page. Change `AGENTS.md` and the release procedure.

## Drawbacks

- The move changes many links. The docs check finds each broken link, but the work is large.
- A reader cannot read all the specification in one file. The index in `SPEC.md` and `docs/README.md` decreases this problem.
- A text frame cannot show colors, sizes or motion. The zones table and the design system page give these facts.
- Box-drawing characters are difficult to type. A contributor can copy a frame and change it.
- The specification has no document version. The version of the application replaces it.

## Rationale and alternatives

### Keep SPEC.md as one file and add frames to it

This is the smallest change. It keeps one source of facts for contributors. But the duplication with the reference pages stays, and the file becomes larger. It also keeps a page that does not follow Diátaxis.

### A separate `docs/design/` folder

This folder holds one page for each screen. It is outside Diátaxis, and the docs check must accept a fifth type. A frame describes what the screen is, so it is a reference fact.

### A design tool, for example Figma or Penpot

A design tool shows colors and sizes. But its files are not text. A pull request cannot show the difference between two versions, and a coding agent cannot read the file. The project can use a design tool to try ideas, but the frame in the reference page is the specification.

### Images of the screens

The command `mise run screenshots` makes images of the current screens. An image shows the result, but it cannot show a desired layout before the code exists. A reference page can link to an image as an addition to the frame.

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
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): the accessibility level that each screen must meet.

## Unresolved questions

1. Do the ADR 0001 and ADR 0002 change to the MADR template, or do they keep their current form?
2. Does a screen page need a line that marks it as part of the specification, for example **Normative: Yes**?
3. Does `reference/user-interface.md` stay as a short overview for users, or do the screen pages replace it?
4. Does the docs check verify the width of the frames and the zone numbers?
5. Is WCAG 2.2 level AA the required level for each screen?

## Future possibilities

- RFC 0002: the user experience and the screen design of all the application. For example, all the dialogs open as bottom sheets on a phone and close with a drag down.
- C4 diagrams for `explanation/architecture.md`.
- Design tokens in the [W3C Design Tokens](https://www.designtokens.org/) format, as one source for `src/styles/tokens/`.
- An accessibility checklist for each screen page.
