# Explanation: Architecture Overview

This article explains the high-level software architecture, data flow, state management, and design philosophy behind **Fertility Tracker**.

---

## Architectural Principles

1. **Clean Architecture & Separation of Concerns:**
   The business logic of Creighton Model calculations (stamp assignment, code parsing, peak detection) is strictly isolated from React components into pure functions in `src/domain/`.
2. **Framework Agnosticism in Core Logic:**
   Functions in `src/domain/` have no dependencies on React, DOM APIs, or state stores. They are tested independently with Vitest.
3. **Reactive State Management via Context:**
   State is shared predictably through top-level React Context providers (`CycleContext`, `ThemeContext`, `LanguageContext`), avoiding heavy external state libraries.

---

## High-Level Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Drawer as ObservationDrawer (UI)
    participant Context as CycleContext
    participant Engine as Domain Engine (src/domain)
    participant Storage as LocalStorage / State

    User->>Drawer: Input Observation (e.g. 10KL X3)
    Drawer->>Engine: formatCodeString(obs)
    Engine-->>Drawer: "10KL X3"
    Drawer->>Context: addObservation(obs)
    Context->>Engine: detectPeakDay(cycle.observations)
    Engine-->>Context: Peak Day ('P') & P+1..P+3 indices
    Context->>Engine: calculateStamp(obs, postPeakDay)
    Engine-->>Context: StampType
    Context->>Storage: Persist updated cycle state
    Context-->>User: Re-render ChartRow, CalendarGrid & Analytics
```

---

## State Architecture

- **CycleContext (Decoupled Data & UI Providers):**
  - **`CycleDataContext`:** Manages cycle creation, daily observation logging, updates, deletions, and manual Peak overrides. Automatically re-evaluates Peak Day detection on state mutation.
  - **`CycleUiContext`:** Manages observation drawer visibility and active selection state without causing unnecessary re-renders in heavy charting views.
  - **`useCycle()`:** Unified convenience hook combining data and UI contexts for complete backward compatibility.
- **ThemeContext:** Manages dark/light mode preference and updates root DOM CSS variable attributes (`data-theme`).
- **LanguageContext:** Manages active i18n locale (`en`, `fr`) backed by strictly-typed `TranslationSchema` dictionaries.

---

## Modular Component & CSS Architecture

- **Subcomponent Decomposition:** Complex views such as `TodayView` are composed of focused subcomponents (`TodayDateNav`, `TodayHistoryList`, `TodayObservationForm`, `TodayFertilityGuidance`) keeping container components lean.
- **Layered CSS Architecture:** Styles are organized in standard CSS `@layer` tiers (`tokens`, `primitives`, `views`, `utilities`), preventing specificity conflicts and enabling seamless dark/light theme transitions through semantic variables.
