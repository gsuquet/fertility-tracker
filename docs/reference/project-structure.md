# Project structure

This page lists the folders and the main files of the repository.

## Folders

```text
fertility-tracker/
├── .github/workflows/ci.yml     # CI workflow for pull requests
├── .mise/
│   ├── config.toml              # Pinned tools: Node.js, npm, pre-commit, gitleaks
│   └── tasks/                   # mise tasks, one shell file for each task
├── docs/                        # Documentation (Diátaxis) and records (RFCs and ADRs)
├── e2e/                         # Playwright end-to-end and accessibility tests
├── public/                      # Static files: manifest, icons, headers
│   └── icons/                   # Logo SVG (favicon), PWA icons (192, 512, maskable 512), Apple touch icon
├── scripts/
│   ├── commits/                 # Commit message checker and its tests
│   ├── docs/                    # Docs checker and its tests
│   └── pwa/                     # Vite plugin that builds sw.js with the precache list
├── src/
│   ├── __tests__/               # Application flow tests
│   ├── components/              # React components
│   │   ├── __tests__/           # Component tests
│   │   ├── chart/               # Parts of the Chart page
│   │   ├── icons/               # Logo (BrandMark) and baby of the stamps (BabyIcon)
│   │   ├── observation/         # Parts of the two observation forms
│   │   └── today/               # Parts of the Today page
│   ├── context/                 # React context providers: cycles, language, theme
│   ├── domain/                  # Pure CrMS rules and data functions
│   ├── hooks/                   # Shared React hooks
│   ├── i18n/                    # Translations
│   │   └── locales/             # en.ts (reference) and fr.ts
│   ├── pwa/                     # Service worker registration
│   ├── styles/                  # CSS in cascade layers and the self-hosted font
│   ├── sw/                      # Service worker: precache and cache strategies
│   ├── test/                    # Test helpers
│   ├── types/                   # TypeScript types and code lists of the domain
│   ├── utils/                   # Dates, export file names, safe storage, vibrations
│   ├── App.tsx                  # Application layout
│   └── main.tsx                 # Entry point
├── AGENTS.md                    # Rules for AI coding agents
├── SPEC.md                      # Index of the specification
├── biome.json                   # Linter and formatter settings
├── package.json                 # Dependencies and npm scripts
├── playwright.config.ts         # End-to-end test settings: browser and web server
├── tsconfig.json                # Strict TypeScript settings
├── vite.config.ts               # Build, test and coverage settings
└── wrangler.json                # Cloudflare Pages settings
```

## Domain files

| File                       | Content                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `codeParser.ts`            | Reads and writes code strings.                             |
| `stampCalculator.ts`       | Fertile mucus test and the stamp of one day.               |
| `peakDetector.ts`          | Peak Day, count of three and cycle days.                   |
| `cycleBoundaryDetector.ts` | Puts the days into cycles.                                 |
| `cyclePhases.ts`           | Phase lengths and averages.                                |
| `mucusScore.ts`            | Mucus score of one day.                                    |
| `observationForm.ts`       | Form values and the cycle start question.                  |
| `dataValidator.ts`         | Validation of saved and restored data.                     |
| `backupImport.ts`          | Preview and merge of a restored backup file.               |
| `storageFormat.ts`         | Versioned format of saved and backup data.                 |
| `backupReminder.ts`        | When to show the backup reminder.                          |
| `swipe.ts`                 | When a swipe changes the day on the Today page.            |
| `sheetDrag.ts`             | When a drag closes the bottom sheet.                       |
| `keyboardShortcuts.ts`     | The shortcut of a key, and when a key stays with the page. |
| `demoData.ts`              | Demo data: two 28-day cycles.                              |
| `versionTracker.ts`        | Release notes, version and storage statistics.             |
| `appVersion.ts`            | Version, build date and last version seen.                 |

## Components

| Component                                    | Content                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `Header.tsx`                                 | Page buttons, cycle picker, header buttons and the phone menu.           |
| `MobileNav.tsx`                              | Page buttons at the bottom of a phone screen.                            |
| `CycleStatsHeader.tsx`                       | Four statistics cards above the pages.                                   |
| `CyclePicker.tsx`                            | Selects one cycle or all cycles.                                         |
| `TodayView.tsx`                              | The **Today** page. Uses the files in `today/`.                          |
| `ChartRow.tsx`                               | The **Paper Chart Strip** page.                                          |
| `CalendarGrid.tsx`                           | The **Monthly Calendar** page.                                           |
| `CycleAnalyticsView.tsx`                     | The **Cycle Analytics** page.                                            |
| `ObservationDrawer.tsx`                      | The observation drawer.                                                  |
| `observation/ProgressiveObservationForm.tsx` | The observation form of the Today page and of the drawer.                |
| `observation/ObservationActionsMenu.tsx`     | The ⋮ menu of an observation: copy, Direct Code Only and delete.         |
| `CycleStartModal.tsx`                        | The **New Cycle Start?** dialog.                                         |
| `StampBadge.tsx`                             | One stamp.                                                               |
| `ExportModal.tsx`                            | The export and backup dialog.                                            |
| `ConfirmDialog.tsx`                          | The confirmation dialog before data is replaced or deleted.              |
| `Modal.tsx`                                  | The accessible modal dialog that all dialogs and drawers use.            |
| `MenuButton.tsx`                             | A ⋮ button and its menu of items, check items and lines.                 |
| `UndoToast.tsx`                              | The toast that undoes the last replace or delete of the data.            |
| `StorageRecoveryNotice.tsx`                  | The alert for saved data that the application cannot read.               |
| `StorageSaveWarning.tsx`                     | The alert when the browser does not save the observations.               |
| `BackupReminder.tsx`                         | The reminder to make a backup.                                           |
| `PrintExportView.tsx`                        | The 35-day chart for printing.                                           |
| `VersionModal.tsx`                           | The **About & Version Tracker** dialog.                                  |
| `WelcomeModal.tsx`                           | The welcome guide.                                                       |
| `KeyboardShortcutsModal.tsx`                 | The list of the keyboard shortcuts, with the switch that turns them off. |
| `Footer.tsx`                                 | Legal text, guide link and version. Not in the installed app.            |
| `LegalNotice.tsx`                            | The trademark text, the medical text and the copyright.                  |
| `ErrorBoundary.tsx`                          | Message and **Reload** button when a part cannot load.                   |
| `LoadingStatus.tsx`                          | The loading text for a screen reader while a lazy part loads.            |

## Related documents

- [Architecture](../explanation/architecture.md)
- [Domain API](domain-api.md)
