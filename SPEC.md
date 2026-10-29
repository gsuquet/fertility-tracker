# Fertility Tracker specification

- **Document version:** 1.32.0
- **Status:** Approved
- **Last updated:** October 28, 2026
- **Repository:** [github.com/gsuquet/fertility-tracker](https://github.com/gsuquet/fertility-tracker)

This document is the full specification of the application. Change it before you change the code. The [docs](docs/README.md) give the same rules for users and contributors.

## Table of contents

1. [Summary](#1-summary)
2. [Architecture and technology](#2-architecture-and-technology)
3. [Domain rules](#3-domain-rules)
4. [Data types](#4-data-types)
5. [User interface](#5-user-interface)
   - [5.1 to 5.6 Navigation, dialog component and pages](#51-to-56-navigation-dialog-component-and-pages)
   - [5.7 to 5.11 Drawer, dialogs and error screen](#57-to-511-drawer-dialogs-and-error-screen)
   - [5.12 to 5.18 Application behavior](#512-to-518-application-behavior)
6. [State and data storage](#6-state-and-data-storage)
7. [Languages and design system](#7-languages-and-design-system)
8. [Tests and quality](#8-tests-and-quality)
9. [Deployment and CI](#9-deployment-and-ci)
10. [Privacy, trademarks and medical limits](#10-privacy-trademarks-and-medical-limits)

## 1. Summary

Fertility Tracker is a web application to chart fertility signs with the Creighton Model FertilityCare™ System (CrMS). The user records bleeding and cervical mucus each day with the standard CrMS codes.

The application does not predict fertile days from a calendar. It uses only the daily observations. From these observations, it calculates the stamp of each day, the Peak Day, the count of three and the start of each cycle.

| Objective      | Requirement                                                                              |
| -------------- | ---------------------------------------------------------------------------------------- |
| Clinical rules | The application follows the standard CrMS codes and stamp rules.                         |
| Paper chart    | The chart looks like the CrMS paper chart. A calendar and statistics are also available. |
| Privacy        | All data stays in the browser. There is no server database, no account and no tracking.  |
| Export         | The user can print a 35-day chart, save it as a PDF file, and back up the data as JSON.  |

## 2. Architecture and technology

These rules are in [Technology](docs/reference/technology.md). The folders are in [Project structure](docs/reference/project-structure.md).

## 3. Domain rules

These rules are in [Observation codes](docs/reference/observation-codes.md), [Stamp and Peak Day rules](docs/reference/stamp-and-peak-rules.md), [Cycle and phase rules](docs/reference/cycle-and-phase-rules.md), [Domain API](docs/reference/domain-api.md) and [Version tracker](docs/reference/version-tracker.md).

## 4. Data types

The types are in [Data format](docs/reference/data-format.md#typescript-types).

## 5. User interface

### 5.1 to 5.6 Navigation, dialog component and pages

These rules are in [Navigation](docs/reference/screens/navigation.md), [Dialog component](docs/reference/dialog-component.md), [Statistics bar](docs/reference/screens/statistics-bar.md), [Today page](docs/reference/screens/today.md), [Paper Chart Strip page](docs/reference/screens/chart.md), [Monthly Calendar page](docs/reference/screens/calendar.md) and [Cycle Analytics page](docs/reference/screens/analytics.md).

### 5.7 to 5.11 Drawer, dialogs and error screen

These rules are in [Observation drawer](docs/reference/screens/observation-drawer.md), [Export dialog](docs/reference/screens/export-dialog.md), [Version dialog](docs/reference/screens/version-dialog.md), [Welcome guide](docs/reference/screens/welcome-guide.md) and [Error screen](docs/reference/screens/error-screen.md).

### 5.12 to 5.18 Application behavior

The rules of sections 5.12 to 5.18 are in [Application behavior](docs/reference/application-behavior.md).

## 6. State and data storage

These rules are in [Data storage](docs/reference/data-storage.md).

## 7. Languages and design system

These rules are in [Languages](docs/reference/languages.md) and [Design system](docs/reference/design-system.md).

## 8. Tests and quality

These rules are in [Test rules and helpers](docs/reference/test-rules.md), [Commands](docs/reference/commands.md), [Documentation rules](docs/reference/documentation-rules.md) and [Commit messages](docs/reference/commit-messages.md).

## 9. Deployment and CI

These rules are in [Deployment](docs/reference/deployment.md). The CI workflow is in [Commands](docs/reference/commands.md#ci-workflow).

## 10. Privacy, trademarks and medical limits

These rules are in [Legal and medical limits](docs/reference/legal-and-medical-limits.md).
