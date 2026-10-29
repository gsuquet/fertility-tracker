# Fertility Tracker documentation

The documentation has four types of pages, from the [Diátaxis](https://diataxis.fr/) framework. Each page has one type. Find your need in the table, then go to the section.

| You want to                    | Read                            |
| ------------------------------ | ------------------------------- |
| Learn by doing, step by step   | [Tutorials](#tutorials)         |
| Do one specific task           | [How-to guides](#how-to-guides) |
| Find a fact, a code or a rule  | [Reference](#reference)         |
| Know why something is as it is | [Explanation](#explanation)     |

The docs use Simplified Technical English (ASD-STE100). Read [Why the docs use STE and Diátaxis](explanation/documentation-approach.md).

## Tutorials

| Page                                                                    | For          |
| ----------------------------------------------------------------------- | ------------ |
| [Chart your first cycle](tutorials/chart-your-first-cycle.md)           | Users        |
| [Make your first code change](tutorials/make-your-first-code-change.md) | Contributors |

## How-to guides

### Use the application

- [Record an observation](how-to/record-an-observation.md)
- [Set the Peak Day](how-to/set-the-peak-day.md)
- [Start a new cycle](how-to/start-a-new-cycle.md)
- [Print a chart for your practitioner](how-to/print-a-chart-for-your-practitioner.md)
- [Back up and restore your data](how-to/back-up-and-restore-your-data.md)
- [Delete all data](how-to/delete-all-data.md)

### Work on the code

- [Install and run locally](how-to/install-and-run-locally.md)
- [Write a test first](how-to/write-a-test-first.md)
- [Add a language](how-to/add-a-language.md)
- [Release a new version](how-to/release-a-new-version.md)
- [Deploy to Cloudflare Pages](how-to/deploy-to-cloudflare.md)
- [Write documentation](how-to/write-documentation.md)

## Reference

### The method and the data

- [Observation codes](reference/observation-codes.md)
- [Stamp and Peak Day rules](reference/stamp-and-peak-rules.md)
- [Cycle and phase rules](reference/cycle-and-phase-rules.md)
- [User interface](reference/user-interface.md)
- [Data format](reference/data-format.md)
- [Data storage](reference/data-storage.md)

### The code

- [Domain API](reference/domain-api.md)
- [Version tracker](reference/version-tracker.md)
- [Project structure](reference/project-structure.md)
- [Languages](reference/languages.md)
- [Design system](reference/design-system.md)
- [Commands](reference/commands.md)
- [Test rules and helpers](reference/test-rules.md)
- [Documentation rules](reference/documentation-rules.md)
- [Commit messages](reference/commit-messages.md)
- [Deployment](reference/deployment.md)
- [Legal and medical limits](reference/legal-and-medical-limits.md)
- [Full specification (SPEC.md)](../SPEC.md)

## Explanation

- [The Creighton Model in this application](explanation/creighton-model.md)
- [Privacy and data storage](explanation/privacy-and-data-storage.md)
- [Architecture](explanation/architecture.md)
- [Testing strategy](explanation/testing-strategy.md)
- [Why the docs use STE and Diátaxis](explanation/documentation-approach.md)

## Records

Records are not Diátaxis pages. An RFC proposes a large change before the work starts. A decision record gives one decision and its reasons.

- [RFC template](records/rfcs/0000-template.md)
- [RFC 0001: Documentation structure, records and screen frames](records/rfcs/0001-documentation-structure.md)
- [ADR template](records/adrs/0000-template.md)
- [ADR 0001: Automatic backup and synchronization with zero-knowledge privacy](records/adrs/0001-automated-backup-and-sync-privacy.md)
- [ADR 0002: CSS in cascade layers with a shared design system](records/adrs/0002-css-maintainability-design-system.md)
- [ADR 0003: Records for proposals and decisions](records/adrs/0003-records-for-proposals-and-decisions.md)
- [ADR 0004: Specification in reference pages](records/adrs/0004-specification-in-reference-pages.md)
- [ADR 0005: Accessibility level of the screens](records/adrs/0005-accessibility-level.md)
