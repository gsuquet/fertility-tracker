# ADR 0010: One-line legal footer in the browser

- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision makers:** Gabriel

## Context and problem

In the browser, the legal and medical card (329 px) is the first item under the chart and the calendar. The installed application already hides it. Where does the trademark and medical notice go?

## Decision drivers

- The notice must stay available on each page.
- The notice must not hide the chart.
- The installed application and the browser must give the same notice.

## Options

- One line under the last card, with a link to the full notice in Settings, About.
- The current card under each page.

## Decision

The browser shows one line under the last card: the copyright, a **Legal** link and the version. The full trademark and medical notice is in Settings, About, and in the welcome guide.

### Consequences

- Good: the chart and the calendar get the space of the card.
- Good: the installed application and the browser show the same full notice in Settings.
- Bad: the full notice needs one tap from each page.

### Confirmation

The screen page of the navigation and its snapshots of step 4a of RFC 0002 check the line and the link.

## Advantages and disadvantages of the options

### One line with a link

- Good: the notice stays one tap away and takes no space.
- Bad: a person reads the full notice only after a tap.

### Current card

- Good: the full notice is always visible.
- Bad: it is the first item under the chart in the browser.

## More information

- [RFC 0002: Phone-first redesign of the screens](../rfcs/0002-phone-first-redesign.md), section Phone shell
- [Issue #115](https://github.com/gsuquet/fertility-tracker/issues/115) and [pull request #116](https://github.com/gsuquet/fertility-tracker/pull/116)
