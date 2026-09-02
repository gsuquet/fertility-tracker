# 2. CSS Maintainability & Layered Design System Architecture

Date: 2026-08-31

## Status

Proposed

## Context

The Fertility Tracker application's visual interface is currently styled via a monolithic 4,840+ line stylesheet (`src/styles/index.css`). This file bundles CSS custom property tokens, global resets, layout rules, component styles (15+ React components), interactive states, modal dialogs, drawers, print styles, and responsive media queries in a single flat file without cascade isolation.

### Current Pain Points:

1. **High Cognitive Load:** Finding and modifying styles for specific components (e.g. `ChartRow`, `CalendarGrid`, `ObservationDrawer`) requires navigating thousands of lines.
2. **Duplication of Reusable UI Patterns:** Common UI patterns like action buttons, surface cards, badge indicators, modal overlays, stepper navigation, and form inputs are declared repeatedly across different component sections with subtle inconsistencies.
3. **Specificity & Cascade Conflicts:** Overriding nested component rules or applying layout variations currently relies on high-specificity selectors or manual ordering in the single file, increasing the risk of regressions.
4. **Collaboration & Extensibility:** Adding new features or themes risks unintended side effects across unrelated views due to lack of modular boundaries and cascade layering.

---

## Architectural Options Evaluated

### Option A: Modular Layered CSS Architecture (`@layer`) (Selected)

Organize styles into domain-driven modular files under `src/styles/` orchestrated by native CSS `@layer` rules (`tokens`, `base`, `primitives`, `views`, `utilities`) and bundled via standard Vite `@import` resolution.

- **Structure:**
  ```
  src/styles/
    ├── index.css               # Layer declarations & master imports
    ├── tokens/                 # Design tokens (colors, spacing, shadows, themes, stamps)
    ├── base/                   # Reset, typography, app-level layout skeleton
    ├── primitives/             # Reusable UI component classes (.btn, .card, .badge, .input, .modal)
    ├── views/                  # Domain view stylesheets (.today, .chart, .calendar, .analytics, .print)
    └── utilities/              # Generic utility helper classes (.flex-center, .sr-only, .truncate)
  ```
- **Pros:**
  - **Zero Specificity Wars:** Native `@layer` guarantees that utilities override view classes, views override primitives, and primitives override base styles regardless of selector specificity.
  - **Zero External Dependencies:** Built with pure standard modern CSS supported natively by modern browsers and Vite; zero JS runtime overhead and zero build plugins required.
  - **Preserves Selector Stability:** Retains existing class naming conventions so Vitest / React Testing Library component queries (`.stamp-badge`, `.cell-today-pill`, etc.) continue functioning without breaking changes.
  - **Design System Reusability:** Extracts common patterns into reusable design system primitive classes (`.btn`, `.btn-primary`, `.card-surface`, `.badge-pill`, `.input-text`).
- **Cons:**
  - Global class namespace requires adhering to consistent prefixing / naming conventions (BEM/kebab-case).

---

### Option B: Component-Colocated CSS Modules (`[Component].module.css`)

Migrate all component-specific styles into localized CSS Modules colocated next to React components in `src/components/`, while retaining global tokens in `src/styles/tokens.css`.

- **Pros:**
  - Strict local scoping prevents any potential CSS class name collisions.
  - High co-location makes it trivial to delete or refactor a component and its styles together.
- **Cons:**
  - Requires modifying every React component import and JSX `className={styles.xxx}` attribute.
  - Breaks DOM query assertions in existing test files that look for raw CSS class strings, requiring extensive test refactoring.
  - Does not inherently solve shared UI primitive reuse without creating a dedicated React primitive component library (`<Button>`, `<Card>`, etc.).

---

### Option C: Utility-First Framework (Tailwind CSS v4)

Adopt Tailwind CSS v4 to manage design tokens and replace bespoke CSS classes with utility classes across all JSX templates.

- **Pros:**
  - Highly standardized spacing, typography, and color scales.
  - Rapid UI composition using standard utilities.
- **Cons:**
  - Requires massive rewrites of all 15+ React component templates.
  - Introduces build-time dependencies, PostCSS configuration, and larger template verbosity for complex domain views (e.g. CrMS chart strips).
  - High disruption to existing codebase and test assertions.

---

### Option D: Zero-Runtime Typed CSS (Vanilla-Extract / StyleX)

Write type-safe styles in TypeScript (`.css.ts`) that compile to static CSS at build time.

- **Pros:**
  - Type safety for design tokens and theme variables.
- **Cons:**
  - Heavy toolchain requirement (Vite plugin, compiler integration).
  - High migration overhead and unnecessary complexity for a focused single-page medical tracking application.

---

## Comprehensive Decision Matrix

| Evaluation Vector                          | Option A: Modular `@layer` CSS (Selected) |     Option B: CSS Modules      |   Option C: Tailwind CSS v4    |     Option D: Typed CSS-in-TS     |
| :----------------------------------------- | :---------------------------------------: | :----------------------------: | :----------------------------: | :-------------------------------: |
| **Maintainability & Organization**         |                   ★★★★★                   |             ★★★★★              |             ★★★★☆              |               ★★★★☆               |
| **Zero Runtime / Zero Heavy Tooling**      |            ★★★★★ (Native CSS)             |     ★★★★★ (Vite built-in)      |    ★★★☆☆ (Tailwind/PostCSS)    | ★★★☆☆ (Vite plugin + TS compiler) |
| **Preserves Existing Tests & Selectors**   |          ★★★★★ (100% compatible)          | ★★☆☆☆ (Requires test rewrites) | ★★☆☆☆ (Requires test rewrites) |  ★★☆☆☆ (Requires test rewrites)   |
| **Design System Reusability**              |        ★★★★★ (Central primitives)         | ★★★☆☆ (Per-component modules)  |     ★★★★★ (Utility tokens)     |     ★★★★☆ (Themed components)     |
| **Cascade & Specificity Control**          |          ★★★★★ (Native `@layer`)          |     ★★★★☆ (Module scopes)      |     ★★★★☆ (Utility layer)      |      ★★★★☆ (Atomic classes)       |
| **Migration Risk & Implementation Effort** |      ★★★★★ (Low risk / Incremental)       |      ★★☆☆☆ (High rewrite)      |      ★☆☆☆☆ (Full rewrite)      |       ★☆☆☆☆ (Full rewrite)        |

---

## Decision

We will adopt **Option A: Modular Layered CSS Architecture (`@layer`) with a Centralized Design System**:

1. **CSS Cascade Layer Order:**
   ```css
   @layer tokens, base, primitives, views, utilities;
   ```
2. **Directory Breakdown (`src/styles/`):**
   - **`tokens/`**:
     - `tokens.css`: Color variables, typography, font-family, spacing, radii, shadows, glassmorphism tokens, stamp palettes, and light/dark theme variables.
     - `animations.css`: Keyframe animations (`fadeIn`, `slideUp`, `pulse`, drawer transitions).
   - **`base/`**:
     - `reset.css`: Universal box-sizing, margin/padding resets, focus visible styles, and root HTML/body typography.
     - `layout.css`: Main app shell container, sticky headers, view wrappers, desktop/mobile responsive viewport paddings.
   - **`primitives/`**: Reusable design system UI classes:
     - `buttons.css`: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`, `.btn-icon`, `.btn-danger`, `.btn-sm`, `.btn-lg`.
     - `cards.css`: `.card`, `.card-surface`, `.card-glass`, `.card-interactive`, `.card-header`, `.card-body`.
     - `forms.css`: `.input-group`, `.input-text`, `.select-custom`, `.textarea-custom`, `.checkbox-custom`, `.toggle-switch`.
     - `badges.css`: `.badge`, `.badge-pill`, `.stamp-badge`, `.badge-indicator`.
     - `dialogs.css`: `.modal-backdrop`, `.modal-container`, `.modal-header`, `.modal-footer`, `.drawer-backdrop`, `.drawer-panel`.
   - **`views/`**: Domain-specific styling:
     - `today.css`: Today dashboard view, quick log banner, action shortcuts.
     - `chart.css`: Creighton paper chart strip (`.chart-table`, `.cell-day`, `.stamp-cell`, `.peak-marker`, `.intercourse-marker`).
     - `calendar.css`: Monthly calendar grid (`.calendar-month`, `.calendar-day-cell`, `.calendar-legend`).
     - `analytics.css`: Analytics cards, biomarker distribution charts, cycle stats summaries.
     - `print.css`: Printable cycle export styling, `@media print` rules, page breakout format.
     - `modals.css`: View-specific modal styles (ExportModal, VersionModal, WelcomeModal, CycleStartModal).
   - **`utilities/`**:
     - `utilities.css`: Flexbox helpers (`.flex-center`, `.gap-2`, `.items-center`), text helpers (`.text-truncate`, `.sr-only`), display helpers.
3. **Master Entrypoint (`src/styles/index.css`):**
   - Declares the `@layer` sequence.
   - Imports each module in order.

---

## Consequences

### Positive

- **Drastically Improved Maintainability:** Replaces a 4,800+ line monolith with small, single-purpose stylesheets (< 300 lines each) categorized by responsibility.
- **Consistent UI Language:** Common components (buttons, badges, cards, inputs, dialogs) share unified design system classes, eliminating visual inconsistencies.
- **Predictable Cascade:** Native `@layer` guarantees clear precedence without specificity hacks or `!important`.
- **Zero Test Breakage:** Component class names and DOM structures remain stable, ensuring 100% test suite compatibility.
- **Fast Build & Hot Reload:** Standard CSS `@import` works immediately with Vite's lightning-fast HMR and minification.

### Negative / Trade-offs

- Multiple CSS files in `src/styles/` require team adherence to directory and layering conventions for new UI components.
