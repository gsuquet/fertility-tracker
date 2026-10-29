# ADR 0003: Records for proposals and decisions

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

The project had decision records in `docs/adr/`, but no format for a large change that needs discussion before the work starts. Where does the project put a proposal, and how does a reader find each decision?

## Decision drivers

- A large change, for example a new design of all the screens, needs a discussion before the work.
- A reader must find all the decisions in one place.
- A record is not a Diátaxis page. It must not mix with the four page types.
- A coding agent must not accept a proposal for the maintainer.

## Options

- RFCs and ADRs in `docs/records/`, with the Rust RFC template and MADR.
- ADRs only, with a longer template for large changes.
- Discussion in pull request comments only.

## Decision

The project uses RFCs and ADRs in `docs/records/`. An RFC uses the Rust RFC template. An ADR uses MADR. Each decision of an accepted RFC also gets a short ADR that links to the RFC.

### Consequences

- Good: a proposal has a fixed format and a status.
- Good: all the decisions are in `docs/records/adrs/`.
- Good: only the maintainer accepts or rejects an RFC. A coding agent never merges an RFC pull request without a written decision of the maintainer.
- Bad: an accepted RFC needs one or more extra ADRs.
- Bad: the two series both start at 0001. Thus, a reference always has the prefix, for example "RFC 0001" or "ADR 0003".

### Confirmation

The docs check accepts records only in `docs/records/rfcs/` and `docs/records/adrs/`. It rejects the old folder `docs/adr/`.

## Advantages and disadvantages of the options

### RFCs and ADRs in docs/records/

- Good: each record type has one purpose.
- Bad: two templates.

### ADRs only

- Good: one template.
- Bad: an ADR is short. It has no place for the frames, the plan of the work or the open questions of a large change.

### Pull request comments only

- Good: no extra file.
- Bad: the reasons are not in the repository, and the project loses them.

## More information

- [RFC 0001: Documentation structure, records and screen frames](../rfcs/0001-documentation-structure.md), sections "RFC and ADR" and "Decision on an RFC"
- [Pull request #100](https://github.com/gsuquet/fertility-tracker/pull/100)
