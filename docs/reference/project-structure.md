# Reference: Project & Component Structure

This reference outlines the folder hierarchy, component breakdown, context architecture, and test suite layout of **Fertility Tracker**.

---

## Directory Overview

```text
fertility-tracker/
├── docs/                      # Diátaxis documentation, ADRs, and RFCs
├── public/                    # Static public assets
├── src/
│   ├── components/            # React UI components & unit tests
│   │   ├── __tests__/         # Component tests (Vitest + RTL)
│   │   ├── CalendarGrid.tsx   # Monthly calendar grid view
│   │   ├── ChartRow.tsx       # Creighton paper chart row component
│   │   ├── CycleAnalyticsView.tsx # Analytics & chart statistics
│   │   ├── CycleStatsHeader.tsx # Header summary metrics bar
│   │   ├── ExportModal.tsx    # PDF / PNG / JSON export dialog
│   │   ├── Header.tsx         # Desktop navigation header & language selector
│   │   ├── MobileNav.tsx      # Mobile navigation bar
│   │   ├── ObservationDrawer.tsx # Drawer for creating/editing observations
│   │   └── StampBadge.tsx     # Color stamp renderer
│   ├── context/               # React Context Providers
│   │   ├── CycleContext.tsx   # Cycle data state & CRUD operations
│   │   ├── LanguageContext.tsx# i18n locale state & translation helper
│   │   └── ThemeContext.tsx   # Dark/Light theme state
│   ├── domain/                # Pure calculation engines & business logic
│   │   ├── __tests__/         # Unit tests for domain logic
│   │   ├── codeParser.ts      # CrMS code parsing & formatting
│   │   ├── cycleBoundaryDetector.ts # Cycle start detection
│   │   ├── peakDetector.ts    # Automated Peak Day calculation
│   │   └── stampCalculator.ts # CrMS stamp color calculator
│   ├── i18n/                  # Translation dictionaries (EN, FR, ES)
│   ├── styles/                # CSS design system & custom properties
│   ├── types/                 # TypeScript interfaces & domain types
│   ├── App.tsx                # Main application component & layout wrapper
│   └── main.tsx               # DOM entry point
├── package.json               # Dependencies and npm scripts
├── tsconfig.json              # TypeScript compiler settings
└── vite.config.ts             # Vite build & Vitest test runner configuration
```

---

## Component Responsibilities

| Component                | Responsibility                                                                                              |
| :----------------------- | :---------------------------------------------------------------------------------------------------------- |
| `App.tsx`                | App root wrapping context providers (`ThemeProvider`, `LanguageProvider`, `CycleProvider`).                 |
| `Header.tsx`             | Top desktop navbar, tab switcher, export trigger, theme toggle, language dropdown.                          |
| `ChartRow.tsx`           | Renders paper chart view, cycle day cards, stamps, code badges, and Peak Day indicators ($P$, $P+1$, etc.). |
| `CalendarGrid.tsx`       | Renders month-by-month calendar view with stamp indicators per day.                                         |
| `CycleAnalyticsView.tsx` | Displays cycle length histogram, post-peak length, mucific score, and fertility metrics.                    |
| `ObservationDrawer.tsx`  | Drawer form for logging bleeding, stretch, modifiers, frequency, symptoms, and manual Peak override.        |
| `StampBadge.tsx`         | Reusable visual badge rendering CrMS stamp colors (`RED`, `DARK_GREEN`, `WHITE_BABY`, `LIGHT_GREEN_BABY`).  |
| `ExportModal.tsx`        | Modal dialog for generating PDF, PNG, and JSON backup files.                                                |
