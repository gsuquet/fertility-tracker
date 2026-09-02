# Reference: Project & Component Structure

This reference outlines the folder hierarchy, component breakdown, context architecture, and test suite layout of **Fertility Tracker**.

---

## Directory Overview

```text
fertility-tracker/
├── docs/                      # Diátaxis documentation, ADRs, and RFCs
├── public/                    # Static public assets (manifest, sw, icons)
├── src/
│   ├── components/            # React UI components & unit tests
│   │   ├── __tests__/         # Component integration tests (Vitest + RTL)
│   │   ├── today/             # Modular Today Dashboard subcomponents
│   │   │   ├── TodayDateNav.tsx         # Compact date navigation & indicators
│   │   │   ├── TodayHistoryList.tsx     # 5-day observation timeline card
│   │   │   ├── TodayObservationForm.tsx # Direct & detailed observation form
│   │   │   └── TodayFertilityGuidance.tsx # Live stamp preview & clinical advice
│   │   ├── CalendarGrid.tsx   # Monthly calendar grid view
│   │   ├── ChartRow.tsx       # Creighton paper chart row component
│   │   ├── CycleAnalyticsView.tsx # Analytics, phase breakdowns & MCS score trends
│   │   ├── CyclePicker.tsx    # Cycle switcher dropdown with active badge
│   │   ├── CycleStartModal.tsx# Confirmation dialog for new cycle boundaries
│   │   ├── CycleStatsHeader.tsx # Header summary metrics bar
│   │   ├── ExportModal.tsx    # Practitioner PDF / PNG / JSON export dialog
│   │   ├── Footer.tsx         # Footer with disclaimers, guide link & version badge
│   │   ├── Header.tsx         # Top desktop navbar & mobile action sheet portal
│   │   ├── MobileNav.tsx      # Bottom fixed navigation bar for mobile touch
│   │   ├── ObservationDrawer.tsx # Drawer for creating/editing observations
│   │   ├── PrintExportView.tsx# Standalone 35-day landscape chart print template
│   │   ├── StampBadge.tsx     # Reusable color stamp renderer
│   │   ├── TodayView.tsx      # Main Today view container & orchestrator
│   │   ├── VersionModal.tsx   # Release notes, system info & diagnostics dialog
│   │   └── WelcomeModal.tsx   # Interactive 4-slide onboarding guide
│   ├── context/               # React Context Providers (Decoupled Data & UI)
│   │   ├── CycleContext.tsx   # CycleDataContext, CycleUiContext & unified useCycle
│   │   ├── LanguageContext.tsx# i18n locale state & translation helper
│   │   └── ThemeContext.tsx   # Dark/Light theme state
│   ├── domain/                # Pure calculation engines & business logic
│   │   ├── __tests__/         # Unit tests for domain logic
│   │   ├── codeParser.ts      # CrMS code parsing & formatting
│   │   ├── cycleBoundaryDetector.ts # Automatic cycle boundary detection
│   │   ├── peakDetector.ts    # Automated Peak Day calculation (P, P+1..P+3)
│   │   ├── stampCalculator.ts # CrMS stamp color & modifier calculator
│   │   └── versionTracker.ts  # Version history, release tracking & diagnostics
│   ├── i18n/                  # Modular translation system
│   │   ├── locales/
│   │   │   ├── en.ts          # Canonical English dictionary
│   │   │   └── fr.ts          # French dictionary implementing TranslationSchema
│   │   ├── index.ts           # Unified export for translations & schemas
│   │   └── types.ts           # TranslationSchema strict TypeScript type
│   ├── styles/                # Layered CSS design system (@layer tokens, primitives, views)
│   ├── types/                 # TypeScript interfaces & domain types
│   ├── utils/                 # Date and export utility helpers
│   ├── App.tsx                # Main application component & layout wrapper
│   └── main.tsx               # DOM entry point
├── biome.json                 # Biome linter and formatter configuration
├── package.json               # Dependencies and npm scripts
├── tsconfig.json              # TypeScript strict compiler settings
└── vite.config.ts             # Vite build & Vitest V8 test coverage configuration
```

---

## Component Responsibilities

| Component                | Responsibility                                                                                              |
| :----------------------- | :---------------------------------------------------------------------------------------------------------- |
| `App.tsx`                | App root wrapping context providers (`ThemeProvider`, `LanguageProvider`, `CycleProvider`).                 |
| `Header.tsx`             | Top navigation bar, tab switcher, cycle picker, export trigger, theme toggle, language switcher.            |
| `TodayView.tsx`          | Orchestrates daily observation logging, date navigation, 5-day timeline, and live stamp guidance.           |
| `ChartRow.tsx`           | Renders paper chart view, cycle day cards, stamps, code badges, and Peak Day indicators ($P$, $P+1$, etc.). |
| `CalendarGrid.tsx`       | Renders month-by-month calendar view with stamp indicators per day.                                         |
| `CycleAnalyticsView.tsx` | Displays cycle length histogram, post-peak length, mucific score, and fertility metrics.                    |
| `CyclePicker.tsx`        | Dropdown selector for active and historical cycles.                                                         |
| `CycleStartModal.tsx`    | Confirmation dialog asking whether bleeding onset begins a new cycle or continues current cycle.            |
| `ObservationDrawer.tsx`  | Drawer form for logging bleeding, stretch, modifiers, frequency, symptoms, and manual Peak override.        |
| `PrintExportView.tsx`    | Print-optimized 35-day paper chart grid formatted for practitioner export.                                  |
| `StampBadge.tsx`         | Reusable visual badge rendering CrMS stamp colors (`RED`, `DARK_GREEN`, `WHITE_BABY`, `LIGHT_GREEN_BABY`).  |
| `ExportModal.tsx`        | Modal dialog for generating PDF, PNG, and JSON backup files.                                                |
| `VersionModal.tsx`       | Modal dialog presenting release notes, feature highlights, system diagnostic specs, and storage stats.      |
| `WelcomeModal.tsx`       | Multi-step onboarding guide introducing CrMS methodology, stamps, and quick-start demo launcher.            |
| `Footer.tsx`             | Application footer displaying medical disclaimers, user guide launcher, and version badge.                  |
