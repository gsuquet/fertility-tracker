# ADR 0007: Phone-first shell and one Settings page

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

The phone has actions in four places: the header, the bottom bar, the menu sheet and the footer. The settings are in two places, and one dialog mixes print, backup, restore, demo and reset. How does the application divide its actions between the pages?

## Decision drivers

- The phone is the main device for the daily observation.
- A person must find each setting in one place.
- A destructive action must not be next to a frequent action.
- The desktop header must fit at 1024 px with the French labels.

## Options

- One navigation, one top bar on each page and one Settings page.
- The current header, menu sheet and footer, with smaller parts.

## Decision

The project uses one navigation: a bottom bar on a phone and tabs on a desktop. Each page has one top bar with the cycle picker and the settings gear. All the settings are in one Settings place: a page on a phone and a dialog of 560 px on a desktop. **Share chart** on the chart replaces the print part of the export dialog. The reason is that each action then has one place, and a destructive action is never next to **Save** or **Restore**.

### Consequences

- Good: each action has one place, and the destructive actions are at the end of Settings.
- Good: the desktop top bar has two rows from 1024 px to 1359 px, so the page does not scroll to the side.
- Bad: a person who knows the current layout must learn the new places of the export and the settings.
- Bad: the e2e tests, the ARIA snapshots and the screenshots change many times.

### Confirmation

The screen pages, their ARIA snapshots and the e2e tests of steps 4a, 4b and 5 of RFC 0002 check the layout.

## Advantages and disadvantages of the options

### One navigation, one top bar and one Settings page

- Good: fewer places to look.
- Bad: a setting is one tap further than in the current menu sheet.

### Current layout with smaller parts

- Good: no new places.
- Bad: the four places and the mixed dialog stay.

## More information

- [RFC 0002: Phone-first redesign of the screens](../rfcs/0002-phone-first-redesign.md), sections Phone shell, Desktop shell, Share chart and Settings
- [Issue #115](https://github.com/gsuquet/fertility-tracker/issues/115) and [pull request #116](https://github.com/gsuquet/fertility-tracker/pull/116)
