# Project structure

This page lists the folders and the main files of the repository.

## Folders

```text
fertility-tracker/
├── .github/workflows/ci.yml     # CI workflow for pull requests
├── .mise/
│   ├── config.toml              # Pinned tools: Node.js, npm, pre-commit, gitleaks
│   └── tasks/                   # mise tasks, one shell file for each task
├── docs/                        # Documentation (Diátaxis) and decision records
├── public/                      # Static files: manifest, service worker, headers
├── scripts/docs/                # Docs checker and its tests
├── src/
│   ├── __tests__/               # Application flow tests
│   ├── components/              # React components
│   │   ├── __tests__/           # Component tests
│   │   ├── chart/               # Parts of the Chart page
│   │   └── today/               # Parts of the Today page
│   ├── context/                 # React context providers: cycles, language, theme
│   ├── domain/                  # Pure CrMS rules and data functions
│   ├── hooks/                   # Shared React hooks
│   ├── i18n/                    # Translations
│   │   └── locales/             # en.ts (reference) and fr.ts
│   ├── styles/                  # CSS in cascade layers
│   ├── test/                    # Test helpers
│   ├── types/                   # TypeScript types of the domain
│   ├── utils/                   # Dates, export file names, safe storage
│   ├── App.tsx                  # Application layout
│   └── main.tsx                 # Entry point
├── AGENTS.md                    # Rules for AI coding agents
├── SPEC.md                      # Full specification
├── biome.json                   # Linter and formatter settings
├── package.json                 # Dependencies and npm scripts
├── tsconfig.json                # Strict TypeScript settings
├── vite.config.ts               # Build, test and coverage settings
└── wrangler.json                # Cloudflare Pages settings
```

## Domain files

| File                       | Content                                        |
| -------------------------- | ---------------------------------------------- |
| `codeParser.ts`            | Reads and writes code strings.                 |
| `stampCalculator.ts`       | Fertile mucus test and the stamp of one day.   |
| `peakDetector.ts`          | Peak Day, count of three and cycle days.       |
| `cycleBoundaryDetector.ts` | Puts the days into cycles.                     |
| `cyclePhases.ts`           | Phase lengths and averages.                    |
| `observationForm.ts`       | Form values and the cycle start question.      |
| `dataValidator.ts`         | Validation of saved and restored data.         |
| `demoData.ts`              | Demo data: two 28-day cycles.                  |
| `versionTracker.ts`        | Release notes, version and storage statistics. |

## Components

| Component                | Content                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `Header.tsx`             | Page buttons, cycle picker, header buttons and the phone menu. |
| `MobileNav.tsx`          | Page buttons at the bottom of a phone screen.                  |
| `CycleStatsHeader.tsx`   | Four statistics cards above the pages.                         |
| `CyclePicker.tsx`        | Selects one cycle or all cycles.                               |
| `TodayView.tsx`          | The **Today** page. Uses the files in `today/`.                |
| `ChartRow.tsx`           | The **Paper Chart Strip** page.                                |
| `CalendarGrid.tsx`       | The **Monthly Calendar** page.                                 |
| `CycleAnalyticsView.tsx` | The **Cycle Analytics** page.                                  |
| `ObservationDrawer.tsx`  | The observation drawer.                                        |
| `CycleStartModal.tsx`    | The **New Cycle Start?** dialog.                               |
| `StampBadge.tsx`         | One stamp.                                                     |
| `ExportModal.tsx`        | The export and backup dialog.                                  |
| `PrintExportView.tsx`    | The 35-day chart for printing.                                 |
| `VersionModal.tsx`       | The **About & Version Tracker** dialog.                        |
| `WelcomeModal.tsx`       | The welcome guide.                                             |
| `Footer.tsx`             | Legal text, guide link and version.                            |

## Related documents

- [Architecture](../explanation/architecture.md)
- [Domain API](domain-api.md)
