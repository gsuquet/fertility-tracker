# Test rules and helpers

This page lists the test rules, the test layers and the test helpers. For the reasons, read [Testing strategy](../explanation/testing-strategy.md).

## Rules

| Rule                                                                        | Enforced by                     |
| --------------------------------------------------------------------------- | ------------------------------- |
| Write the test before the code.                                             | Review                          |
| Keep 100% coverage for statements, branches, functions and lines.           | `vite.config.ts` thresholds, CI |
| Do not add coverage ignore comments.                                        | Review                          |
| Remove code that no test can reach.                                         | Coverage report                 |
| Find elements by role and accessible name, not by CSS class.                | Review                          |
| Get the expected text from the locale files, for example `en.actions.save`. | Review                          |
| Set the date with `vi.setSystemTime()`. Use fake timers for delays.         | Review                          |
| Give each test a name that tells the behavior.                              | Review                          |

## Test layers

| Layer       | Location                       | Tool                  | Content                                                                         |
| ----------- | ------------------------------ | --------------------- | ------------------------------------------------------------------------------- |
| Domain      | `src/domain/__tests__/`        | Vitest                | Pure functions: code parser, stamp rules, Peak Day, cycles, phases, validation. |
| Utilities   | `src/utils/__tests__/`         | Vitest                | Dates, export file names, safe storage.                                         |
| Hooks       | `src/hooks/__tests__/`         | `renderHook`          | Form state that more than one component uses.                                   |
| Contexts    | `src/context/__tests__/`       | `renderHook`          | Saved data, language and theme.                                                 |
| Components  | `src/components/**/__tests__/` | React Testing Library | Rendered output and user actions.                                               |
| Application | `src/__tests__/`               | React Testing Library | Flows across many components, for example print.                                |
| Styles      | `src/styles/__tests__/`        | Vitest                | CSS rules for problems that the tests cannot see, for example dark mode colors. |
| Tools       | `scripts/docs/__tests__/`      | Vitest                | The docs checker.                                                               |
| End-to-end  | `e2e/`                         | Playwright and axe    | Main flows and accessibility in Chromium, against the production build.         |

## Coverage scope

| Included            | Excluded                                                            |
| ------------------- | ------------------------------------------------------------------- |
| `src/**/*.{ts,tsx}` | Test files, `src/test/**`, `src/setupTests.ts`, `src/vite-env.d.ts` |
| `scripts/**/*.ts`   | Test files                                                          |

## Test helpers

| Helper                                 | File                     | Use                                                                  |
| -------------------------------------- | ------------------------ | -------------------------------------------------------------------- |
| `makeObservation({ date, ...fields })` | `src/test/factories.ts`  | Makes a valid observation. Give only the fields that the test needs. |
| `renderWithProviders(ui, options)`     | `src/test/render.tsx`    | Renders a component in all the application providers.                |
| `buildDemoObservations(today)`         | `src/domain/demoData.ts` | Makes two full cycles of realistic data.                             |

Options of `renderWithProviders`:

| Option            | Example | Effect                                  |
| ----------------- | ------- | --------------------------------------- |
| `language`        | `'fr'`  | Renders in French.                      |
| `observations`    | `[...]` | Starts with saved data.                 |
| `selectedCycleId` | `'all'` | Selects a cycle after the first render. |

The setup file `src/setupTests.ts` clears `localStorage` after each test.

## End-to-end tests

Playwright runs the files in `e2e/`. Vitest does not run them, and the coverage report does not include them. The settings are in `playwright.config.ts`.

| Item                | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| Browser             | Chromium                                                                               |
| Application         | The production build: `vite build`, then `vite preview` on port `4173`.                |
| Date in the browser | `2026-10-27`, set with `page.clock.setFixedTime()`.                                    |
| Type check          | `e2e/tsconfig.json`.`npm run typecheck` checks it.                                     |
| Accessibility tags  | `wcag2a` and `wcag2aa`, with `@axe-core/playwright`.                                   |
| Local browser       | Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use a Chromium that is already installed. |

| Test file                   | Flows                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `e2e/app.spec.ts`           | Welcome guide on the first visit, observation after a reload, backup and restore, demo data in each view. |
| `e2e/accessibility.spec.ts` | Axe check of each view and of the export dialog.                                                          |

| Helper              | File              | Use                                                               |
| ------------------- | ----------------- | ----------------------------------------------------------------- |
| `openApp(page)`     | `e2e/fixtures.ts` | Opens the application on a fixed date, without the welcome guide. |
| `fixClock(page)`    | `e2e/fixtures.ts` | Sets the date in the browser to `TODAY`.                          |
| `skipWelcome(page)` | `e2e/fixtures.ts` | Marks the welcome guide as seen.                                  |

`KNOWN_VIOLATIONS` in `e2e/accessibility.spec.ts` lists the axe rule ids that the application breaks today. The check ignores only these rules. A violation of a different rule makes the test fail. When a correction is merged, remove its rule id from the list.

## Related documents

- [Write a test first](../how-to/write-a-test-first.md)
- [Commands](commands.md)
