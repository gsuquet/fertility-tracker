# Fertility Tracker specification

- **Repository:** [github.com/gsuquet/fertility-tracker](https://github.com/gsuquet/fertility-tracker)

This page is the index of the specification. The specification is the set of pages in [docs/reference/](docs/README.md#reference). Change the page of a rule before you change the code ([ADR 0004](docs/records/adrs/0004-specification-in-reference-pages.md)).

## Summary

Fertility Tracker is a web application to chart fertility signs with the Creighton Model FertilityCare™ System (CrMS). The user records bleeding and cervical mucus each day with the standard CrMS codes.

The application does not predict fertile days from a calendar. It uses only the daily observations. From these observations, it calculates the stamp of each day, the Peak Day, the count of three and the start of each cycle.

| Objective      | Requirement                                                                              |
| -------------- | ---------------------------------------------------------------------------------------- |
| Clinical rules | The application follows the standard CrMS codes and stamp rules.                         |
| Paper chart    | The chart looks like the CrMS paper chart. A calendar and statistics are also available. |
| Privacy        | All data stays in the browser. There is no server database, no account and no tracking.  |
| Export         | The user can print a 35-day chart, save it as a PDF file, and back up the data as JSON.  |

## Page of each source file

Find the file or the folder that you change. Then change its page first.

| Source                                                                                                   | Page                                                                   |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/domain/codeParser.ts`                                                                               | [Observation codes](docs/reference/observation-codes.md)               |
| `src/domain/stampCalculator.ts`, `src/domain/peakDetector.ts`                                            | [Stamp and Peak Day rules](docs/reference/stamp-and-peak-rules.md)     |
| `src/domain/cycleBoundaryDetector.ts`, `src/domain/cyclePhases.ts`, `src/domain/mucusScore.ts`           | [Cycle and phase rules](docs/reference/cycle-and-phase-rules.md)       |
| `src/domain/versionTracker.ts`, `src/domain/appVersion.ts`                                               | [Version tracker](docs/reference/version-tracker.md)                   |
| The other files in `src/domain/`                                                                         | [Domain API](docs/reference/domain-api.md)                             |
| `src/types/crms.ts`                                                                                      | [Data format](docs/reference/data-format.md)                           |
| `src/context/`, `src/utils/storage.ts`, `src/utils/storageKeys.ts`                                       | [Data storage](docs/reference/data-storage.md)                         |
| `src/i18n/`                                                                                              | [Languages](docs/reference/languages.md)                               |
| `src/styles/`                                                                                            | [Design system](docs/reference/design-system.md)                       |
| `src/components/Modal.tsx`                                                                               | [Dialog component](docs/reference/dialog-component.md)                 |
| `src/components/Header.tsx`, `Footer.tsx`, `MobileNav.tsx`, `CyclePicker.tsx`                            | [Navigation](docs/reference/screens/navigation.md)                     |
| `src/components/CycleStatsHeader.tsx`                                                                    | [Statistics bar](docs/reference/screens/statistics-bar.md)             |
| `src/components/TodayView.tsx`, `src/components/today/`                                                  | [Today page](docs/reference/screens/today.md)                          |
| `src/components/ChartRow.tsx`, `src/components/chart/`                                                   | [Paper Chart Strip page](docs/reference/screens/chart.md)              |
| `src/components/CalendarGrid.tsx`                                                                        | [Monthly Calendar page](docs/reference/screens/calendar.md)            |
| `src/components/CycleAnalyticsView.tsx`                                                                  | [Cycle Analytics page](docs/reference/screens/analytics.md)            |
| `src/components/ObservationDrawer.tsx`, `src/components/observation/`                                    | [Observation drawer](docs/reference/screens/observation-drawer.md)     |
| `src/components/ExportModal.tsx`, `PrintExportView.tsx`, `ConfirmDialog.tsx`, `src/utils/exportUtils.ts` | [Export dialog](docs/reference/screens/export-dialog.md)               |
| `src/components/VersionModal.tsx`                                                                        | [Version dialog](docs/reference/screens/version-dialog.md)             |
| `src/components/WelcomeModal.tsx`                                                                        | [Welcome guide](docs/reference/screens/welcome-guide.md)               |
| `src/components/ErrorBoundary.tsx`                                                                       | [Error screen](docs/reference/screens/error-screen.md)                 |
| `src/components/LegalNotice.tsx`                                                                         | [Legal and medical limits](docs/reference/legal-and-medical-limits.md) |
| `src/App.tsx`, `src/hooks/`, `src/pwa/` and the other files in `src/components/` and `src/utils/`        | [Application behavior](docs/reference/application-behavior.md)         |
| `src/sw/`, `public/`, `wrangler.json`                                                                    | [Deployment](docs/reference/deployment.md)                             |
| `package.json`, `vite.config.ts`, `src/main.tsx`                                                         | [Technology](docs/reference/technology.md)                             |
| `e2e/` and the `__tests__` folders                                                                       | [Test rules and helpers](docs/reference/test-rules.md)                 |
| `.mise/tasks/`, `.github/workflows/`                                                                     | [Commands](docs/reference/commands.md)                                 |
| `docs/`, `README.md`, `AGENTS.md`, `SPEC.md`                                                             | [Documentation rules](docs/reference/documentation-rules.md)           |

When a page does not give a rule, read [Project structure](docs/reference/project-structure.md) and [Architecture](docs/explanation/architecture.md).

## History

This page had all the rules in one file until version 1.32.0. [RFC 0001](docs/records/rfcs/0001-documentation-structure.md) moved them to the reference pages. The version of the application in `package.json` and the release notes in `src/domain/versionTracker.ts` are the history. The pages have no document version.
