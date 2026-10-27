# Testing strategy

This document explains how the project tests its code and why.

## Rules

- Write the test before the code. The project uses test-driven development (TDD).
- Keep coverage at 100% for statements, branches, functions and lines.
- Do not add coverage ignore comments.
- Remove code that no test can reach.

The test run fails when one metric is less than 100%. The CI workflow runs the same command on each pull request. Thus, code without a test cannot go into `main`.

## Why 100% coverage

The application stores health data on the device of the user. An error in the stamp rules or in the cycle rules gives incorrect fertility guidance. A test for each branch makes sure that each rule has a known result.

100% coverage does not prove that the code is correct. It proves that each line ran in a test. The tests must also make assertions about the result.

A coverage gap is often a sign of dead code. For example, a guard for a value that the types do not permit, or a fallback for a translation key that always exists. When you find a gap, first ask: "Can this branch occur?" If the answer is no, remove the branch. If the answer is yes, write a test for it.

## Test layers

| Layer       | Location                       | Tool                  | Purpose                                                                       |
| ----------- | ------------------------------ | --------------------- | ----------------------------------------------------------------------------- |
| Domain      | `src/domain/__tests__/`        | Vitest                | Pure functions: code parser, stamp rules, Peak Day, cycle limits, validation. |
| Utilities   | `src/utils/__tests__/`         | Vitest                | Dates, export file names, safe storage.                                       |
| Hooks       | `src/hooks/__tests__/`         | `renderHook`          | Form state that more than one component uses.                                 |
| Contexts    | `src/context/__tests__/`       | `renderHook`          | Saved data, language and theme.                                               |
| Components  | `src/components/**/__tests__/` | React Testing Library | Rendered output and user actions.                                             |
| Application | `src/__tests__/`               | React Testing Library | Flows across many components, for example print.                              |

Put the most rules in the domain layer. Domain tests are fast and they do not need a browser.

## Test helpers

The helpers are in `src/test/`. The coverage report does not include them.

- `makeObservation({ date, ...fields })` makes a valid observation. Give only the fields that the test needs.
- `renderWithProviders(ui, options)` renders a component in all the app providers.
  - `language: 'fr'` renders in French.
  - `observations: [...]` starts with saved data.
  - `selectedCycleId: 'all'` selects a cycle after the first render.
- `buildDemoObservations(today)` in `src/domain/demoData.ts` makes two full cycles. Use it when a test needs realistic data.

The setup file `src/setupTests.ts` clears `localStorage` after each test. Thus, no test can change the result of a different test.

## How to write good tests

- Find elements by role and by accessible name, for example `getByRole('button', { name: 'Save' })`. Do not find elements by CSS class when a role is available.
- Get the text from the locale files, for example `en.actions.save`. Then a text change does not break the test.
- Use fake timers for dates and delays. Set the date with `vi.setSystemTime()`.
- Make one assertion about the result of each action.
- Give each test a name that tells the behavior, for example "clears the data only after confirmation".

## Related documents

- [Write a test first](../how-to/write-a-test-first.md)
- [Architecture overview](architecture-overview.md)
