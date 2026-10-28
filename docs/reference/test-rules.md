# Test rules and helpers

This page lists the test rules, the test layers and the test helpers. For the reasons, read [Testing strategy](../explanation/testing-strategy.md).

## Rules

| Rule                                                                         | Enforced by                     |
| ---------------------------------------------------------------------------- | ------------------------------- |
| Write the test before the code.                                              | Review                          |
| Keep 100% coverage for statements, branches, functions and lines.            | `vite.config.ts` thresholds, CI |
| Do not add coverage ignore comments.                                         | Review                          |
| Remove code that no test can reach.                                          | Coverage report                 |
| Find elements by role and accessible name, not by CSS class.                 | Review                          |
| Get the expected text from the locale files, for example `en.actions.save`.  | Review                          |
| Do not write user-visible text in a `.tsx` file. Put it in the locale files. | `noHardcodedText.test.ts`       |
| Set the date with `vi.setSystemTime()`. Use fake timers for delays.          | Review                          |
| Give each test a name that tells the behavior.                               | Review                          |

## Test layers

| Layer       | Location                                  | Tool                  | Content                                                                         |
| ----------- | ----------------------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| Domain      | `src/domain/__tests__/`                   | Vitest                | Pure functions: code parser, stamp rules, Peak Day, cycles, phases, validation. |
| Utilities   | `src/utils/__tests__/`                    | Vitest                | Dates, export file names, safe storage.                                         |
| Hooks       | `src/hooks/__tests__/`                    | `renderHook`          | Form state that more than one component uses.                                   |
| Contexts    | `src/context/__tests__/`                  | `renderHook`          | Saved data, language and theme.                                                 |
| Components  | `src/components/**/__tests__/`            | React Testing Library | Rendered output and user actions.                                               |
| Application | `src/__tests__/`                          | React Testing Library | Flows across many components, for example print.                                |
| Styles      | `src/styles/__tests__/`                   | Vitest                | CSS rules for problems that the tests cannot see, for example dark mode colors. |
| PWA         | `src/sw/__tests__/`, `src/pwa/__tests__/` | Vitest                | Service worker cache strategies and the service worker registration.            |
| Tools       | `scripts/**/__tests__/`                   | Vitest                | The docs checker and the service worker build plugin.                           |
| End-to-end  | `e2e/`                                    | Playwright and axe    | Main flows and accessibility in Chromium, against the production build.         |

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
| Date in the browser | `2026-10-27T12:00:00Z`, in the `UTC` time zone. `page.clock.setFixedTime()` sets it.   |
| Type check          | `e2e/tsconfig.json`.`npm run typecheck` checks it.                                     |
| Accessibility tags  | `wcag2a` and `wcag2aa`, with `@axe-core/playwright`.                                   |
| Local browser       | Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use a Chromium that is already installed. |
| Server reuse        | Set `PW_REUSE=1` to use a server that already runs on port `4173`.                     |
| Server port         | Set `PW_PORT` to use a different port. The default is `4173`.                          |

| Test file                   | Flows                                                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/app.spec.ts`           | Welcome guide on the first visit, observation after a reload, backup and restore through the confirm dialog, the undo message and the import preview, demo data in each view, manual Peak Day, the undo toast in the drawer dialog. |
| `e2e/accessibility.spec.ts` | Axe check of each view and of the export dialog.                                                                                                                                                                                    |
| `e2e/resilience.spec.ts`    | Saved data that is not JSON, a list with one record that is not valid, a save that fails, and a reload without a network, also on the address of a page.                                                                            |
| `e2e/history.spec.ts`       | **Back** on the drawer and on two stacked dialogs, **Back** after a page change and on the first page, a reload on the chart page, and an unknown hash.                                                                             |
| `e2e/install.spec.ts`       | No install offer before the browser can install, the header button and the banner after 3 observations, **Install**, and the close button.                                                                                          |
| `e2e/drawer.spec.ts`        | **+** opens the saved observation of today, and a save with no change keeps it.                                                                                                                                                     |

| Helper                           | File              | Use                                                                                     |
| -------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `openApp(page)`                  | `e2e/fixtures.ts` | Opens the application on a fixed date, without the welcome guide.                       |
| `fixClock(page)`                 | `e2e/fixtures.ts` | Sets the date in the browser to `TODAY`.                                                |
| `skipWelcome(page)`              | `e2e/fixtures.ts` | Marks the welcome guide as seen.                                                        |
| `labelPattern(template, values)` | `e2e/fixtures.ts` | Makes a pattern from a locale template. A placeholder without a value matches all text. |
| `escapeRegExp(text)`             | `e2e/fixtures.ts` | Escapes the special characters of a regular expression in a text.                       |

`KNOWN_VIOLATIONS` in `e2e/accessibility.spec.ts` lists the axe violations of each screen today, as pairs of a rule id and a target. A pair that is not in the list makes the test fail. A listed pair that does not occur also makes the test fail. When a correction is merged, remove its pairs from the list.

## Related documents

- [Write a test first](../how-to/write-a-test-first.md)
- [Commands](commands.md)
