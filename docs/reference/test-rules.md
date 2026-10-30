# Test rules and helpers

This page lists the test rules, the test layers and the test helpers. For the reasons, read [Testing strategy](../explanation/testing-strategy.md).

The project uses test-driven development (TDD). Write a test that fails before each change of behavior. Then write the minimum code that makes it pass. Biome and the strict TypeScript compiler do the static analysis.

## Rules

| Rule                                                                                                                   | Enforced by                     |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Write the test before the code.                                                                                        | Review                          |
| Keep 100% coverage for statements, branches, functions and lines.                                                      | `vite.config.ts` thresholds, CI |
| Do not add coverage ignore comments.                                                                                   | Review                          |
| Remove code that no test can reach, for example guards for values that the types do not permit.                        | Coverage report                 |
| Find elements by role and accessible name, not by CSS class.                                                           | Review                          |
| Get the expected text from the locale files, for example `en.actions.save`.                                            | Review                          |
| Do not write user-visible text in a `.tsx` file. Put it in the locale files.                                           | `noHardcodedText.test.ts`       |
| Set the date with `vi.setSystemTime()`. Use fake timers for delays.                                                    | Review                          |
| Give each test a name that tells the behavior.                                                                         | Review                          |
| Keep all the `a11y` rules of the Biome recommended preset. Do not add an override that disables an accessibility rule. | `biome.json`, review            |

## Test layers

| Layer       | Location                                  | Tool                  | Content                                                                                                                                     |
| ----------- | ----------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain      | `src/domain/__tests__/`                   | Vitest                | Pure functions: code parser, stamps, Peak Day, cycles, phases, validation, demo data, form values, mucus score, sheet drag and swipe rules. |
| Utilities   | `src/utils/__tests__/`                    | Vitest                | Dates, export file names, safe `localStorage` access and storage keys.                                                                      |
| Hooks       | `src/hooks/__tests__/`                    | `renderHook`          | `useObservationForm`, `useToast`, `useHistoryLayer`, `useSheetDrag` and `useDaySwipe`.                                                      |
| Contexts    | `src/context/__tests__/`                  | `renderHook`          | Saved data, cycle selection, language and theme.                                                                                            |
| Components  | `src/components/**/__tests__/`            | React Testing Library | Rendered output and user actions. Tests find elements by role and accessible name.                                                          |
| Application | `src/__tests__/`                          | React Testing Library | Flows across components: welcome guide, print, entry point and error boundary.                                                              |
| Styles      | `src/styles/__tests__/`                   | Vitest                | CSS rules that jsdom cannot show, for example theme colors and phone layout.                                                                |
| PWA         | `src/sw/__tests__/`, `src/pwa/__tests__/` | Vitest                | Service worker cache rules and the service worker registration.                                                                             |
| Tools       | `scripts/**/__tests__/`                   | Vitest                | The documentation check, the commit message check and the service worker build plugin.                                                      |
| End-to-end  | `e2e/`                                    | Playwright and axe    | Playwright flows and axe checks in Chromium, on the production build.                                                                       |

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

The setup file `src/setupTests.ts` clears `localStorage` after each test. jsdom has no `HTMLDialogElement.showModal()` or `close()`. Thus, `src/setupTests.ts` adds two small versions that set and remove the `open` attribute.

## End-to-end tests

Playwright runs the files in `e2e/`. Vitest does not run them, and the coverage report does not include them. The settings are in `playwright.config.ts`.

| Item                | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Browser             | Chromium                                                                                                  |
| Projects            | `chromium`: a computer screen. `phone`: 390 by 844 pixels with touch, for `e2e/phoneLayout.spec.ts` only. |
| Application         | The production build: `vite build`, then `vite preview` on port `4173`.                                   |
| Date in the browser | `2026-10-27T12:00:00Z`, in the `UTC` time zone. `page.clock.setFixedTime()` sets it.                      |
| Type check          | `npm run typecheck` checks the files with `e2e/tsconfig.json`.                                            |
| Accessibility tags  | `wcag2a` and `wcag2aa`, with `@axe-core/playwright`, on each page, on the export dialog and on Settings.  |
| Local browser       | Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use a Chromium that is already installed.                    |
| Server reuse        | Set `PW_REUSE=1` to use a server that already runs on port `4173`.                                        |
| Server port         | Set `PW_PORT` to use a different port. The default is `4173`.                                             |

| Test file                    | Flows                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/app.spec.ts`            | Welcome guide on the first visit, and observation after a reload. Backup and restore through the confirm dialog, the undo message and the import preview. Demo data in each view, manual Peak Day, and the undo toast in the drawer dialog.                                                                                                                                                                                            |
| `e2e/accessibility.spec.ts`  | Axe check of each view, of the export dialog and of Settings.                                                                                                                                                                                                                                                                                                                                                                          |
| `e2e/resilience.spec.ts`     | Saved data that is not JSON, and a list with one record that is not valid. A save that fails, and a reload without a network, also on the address of a page.                                                                                                                                                                                                                                                                           |
| `e2e/history.spec.ts`        | **Back** on the drawer and on two stacked dialogs. **Back** after a page change and on the first page. A reload on the chart page, and an unknown hash.                                                                                                                                                                                                                                                                                |
| `e2e/install.spec.ts`        | No install offer before the browser can install, the header button and the banner after 3 observations, **Install**, and the close button.                                                                                                                                                                                                                                                                                             |
| `e2e/drawer.spec.ts`         | **+** opens the saved observation of today, and a save with no change keeps it. A long drag on the handle closes the drawer, and a short drag puts it back.                                                                                                                                                                                                                                                                            |
| `e2e/badge.spec.ts`          | In a fake installed app, the switch in Settings turns the badge on. The dot shows while today has no observation, also after a reload.                                                                                                                                                                                                                                                                                                 |
| `e2e/pageTransition.spec.ts` | On a computer, a page change slides in the page order, also on Back. With reduced motion, no transition starts.                                                                                                                                                                                                                                                                                                                        |
| `e2e/shortcuts.spec.ts`      | On a computer, the keys change the page and the day. A key in a field stays in it, and the switch turns the keys off.                                                                                                                                                                                                                                                                                                                  |
| `e2e/swipe.spec.ts`          | With touch on a phone, a swipe to the left opens the next day, and a swipe to the right opens the previous day. A vertical drag keeps the day.                                                                                                                                                                                                                                                                                         |
| `e2e/haptics.spec.ts`        | On a phone, a save and the Peak Day button vibrate. After the **Vibration** switch of Settings turns the vibrations off, nothing vibrates, also after a reload.                                                                                                                                                                                                                                                                        |
| `e2e/chartScroll.spec.ts`    | At 390 and 1440 pixels, the chart opens with the cell of today in view, also after a reload and a page change.                                                                                                                                                                                                                                                                                                                         |
| `e2e/screenLayout.spec.ts`   | At 390 and 1440 pixels, each page and dialog with the demo data matches its ARIA snapshot in `docs/reference/screens/snapshots/`. After a correct change of a screen, run `npx playwright test e2e/screenLayout.spec.ts --update-snapshots`. Then put a pattern back for each value that changes without a screen change, for example the version or the build date. A fixed label, for example a code button, keeps its literal text. |
| `e2e/phoneLayout.spec.ts`    | On a phone, in English and in French: no page is wider than the screen, and no text is smaller than 11 pixels. The bottom bar marks the open page. The controls of each day are 44 pixels or more. Read [Layout checks](layout-checks.md).                                                                                                                                                                                             |
| `e2e/layoutCaptures.spec.ts` | Only with `SCREENSHOTS=1`: the captures at 1024 pixels, in French and of the installed application. Read [Layout checks](layout-checks.md).                                                                                                                                                                                                                                                                                            |
| `e2e/settings.spec.ts`       | On a phone, Settings is a full page over the bottom bar, with the back button at the left. **Back** closes it. The language and the theme stay after a reload.                                                                                                                                                                                                                                                                         |

Each flow in this table must have an end-to-end test.

| Flow | Expected result                                                                                                                                                                                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | The first visit shows the welcome guide. `Escape` closes it.                                                                                                                                                                                                                  |
| 2    | An observation from the **Today** page stays after a reload.                                                                                                                                                                                                                  |
| 3    | Backup, reset (with **Delete all data** and the undo message), new observation, restore with preview and **Replace** bring back the backup.                                                                                                                                   |
| 4    | After **Load the demo cycles**, the chart, calendar and analytics pages show the demo data.                                                                                                                                                                                   |
| 5    | A manual Peak Day moves the Peak Day and the count of three. Without it, the calculated Peak Day comes back, also after a reload.                                                                                                                                             |
| 6    | Saved data that is not JSON shows the recovery message, and the recovery key keeps the text. **Delete the copy** removes both.                                                                                                                                                |
| 7    | A saved list with one record that is not valid shows the other observations and the recovery message for 1 record.                                                                                                                                                            |
| 8    | When `localStorage.setItem` fails for the observations, the save warning shows. **Back up now** downloads a `.ftbackup` file.                                                                                                                                                 |
| 9    | After the first visit, the service worker controls the page. Offline, a reload opens the application and a new observation saves.                                                                                                                                             |
| 10   | After **Load the demo cycles**, the undo message is in the drawer when it opens. **Undo** brings back the empty chart, the title becomes **Log Observation**, and the focus goes to the dialog. After the drawer closes, the chart stays empty and the message does not show. |
| 11   | On a phone, **+** opens the saved observation of today. A save with no change keeps it.                                                                                                                                                                                       |
| 12   | On a phone, a short drag on the handle puts the sheet back. A long drag closes it, and **Back** then does not open it again.                                                                                                                                                  |
| 13   | On a phone with touch, a swipe to the left on **Today** opens the next day. A swipe to the right opens the previous day. A vertical swipe does not change the day.                                                                                                            |
| 14   | On a computer, the arrow keys and `T` change the day, and `2` opens the chart. A key in a field stays in it. After **Use keyboard shortcuts** is off, the keys do nothing, also after a reload.                                                                               |
| 15   | On a computer, a page on the right slides in from the right, and **Back** slides in from the left. With reduced motion, no transition starts.                                                                                                                                 |
| 16   | In the installed app, after **Show a dot on the app icon**, the dot shows while today has no observation. A save removes it, and the choice stays after a reload.                                                                                                             |
| 17   | On a phone with touch, a swipe down on the cycle menu and the export dialog closes them. A swipe up on them does not scroll the page. When the export dialog opens, it slides up from the bottom of the screen.                                                               |
| 18   | On a phone with touch, a swipe to the right on the calendar opens the previous month. A swipe to the left opens the next month. In the current month, a swipe to the left does not change the month.                                                                          |
| 19   | On a phone, the gear opens Settings as a full page that covers the bottom bar. **Back** closes it. A language and a theme from Settings stay after a reload.                                                                                                                  |

| Helper                           | File              | Use                                                                                                      |
| -------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `openApp(page)`                  | `e2e/fixtures.ts` | Opens the application on a fixed date, without the welcome guide.                                        |
| `fixClock(page)`                 | `e2e/fixtures.ts` | Sets the date in the browser to `TODAY`.                                                                 |
| `skipWelcome(page)`              | `e2e/fixtures.ts` | Marks the welcome guide as seen.                                                                         |
| `labelPattern(template, values)` | `e2e/fixtures.ts` | Makes a pattern from a locale template. A placeholder without a value matches all text.                  |
| `escapeRegExp(text)`             | `e2e/fixtures.ts` | Escapes the special characters of a regular expression in a text.                                        |
| `openSettings(page)`             | `e2e/fixtures.ts` | Opens Settings with the gear of the header and gives the dialog.                                         |
| `loadDemoData(page)`             | `e2e/fixtures.ts` | Loads the demo cycles from Settings, when the application has no data.                                   |
| `openShareChart(page)`           | `e2e/fixtures.ts` | Opens the chart page if necessary, then **Share chart** in the **Chart options** menu. Gives the dialog. |

`KNOWN_VIOLATIONS` in `e2e/accessibility.spec.ts` lists the axe violations of each screen today, as pairs of a rule id and a target. A pair that is not in the list makes the test fail. A listed pair that does not occur also makes the test fail. All the pairs are `color-contrast` (issue #49, see also #34 and #35). When a correction is merged, remove its pairs from the list. Thus, the list becomes shorter with each correction.

## Related documents

- [Write a test first](../how-to/write-a-test-first.md)
- [Commands](commands.md)
