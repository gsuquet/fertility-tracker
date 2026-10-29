# Navigation

This page gives the rules for the header, the page buttons, the footer and the cycle menu.

## Layout

This part shows on each page. Its layout is in the screenshots and the ARIA snapshots of the pages, for example [Today page](today.md#layout).

## Behavior

The application has four pages, a header, a statistics bar, an observation drawer and dialogs. A phone screen is 640 pixels wide or less.

| Part                                                                  | Wide screen                                                                                                                                                                                                       | Phone screen                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header ([Header.tsx](../../../src/components/Header.tsx))             | Logo, page tabs, cycle picker, **Log Observation**, export, guide, version, language (`en`, `fr`) and theme buttons, and the **Settings** gear. The header is 68 pixels high, and the buttons are 42 pixels high. | The top bar: 54 pixels high, with the controls of the page, the cycle picker and the **Settings** gear. It has no logo. The other actions are in [Settings](settings.md). Read [Top bar](#top-bar-on-a-phone). |
| Page buttons ([MobileNav.tsx](../../../src/components/MobileNav.tsx)) | In the header                                                                                                                                                                                                     | The bottom bar: fixed at the bottom, 62 pixels high plus the safe area, with a 44-pixel **+** button for a new observation.                                                                                    |
| Dialogs                                                               | Centered                                                                                                                                                                                                          | Open from the bottom, with 24-pixel top corners, a maximum height of `88dvh`, and a fixed header and footer                                                                                                    |
| Footer ([Footer.tsx](../../../src/components/Footer.tsx))             | One line under the page: "© 2026 Fertility Tracker · Legal · v1.38.0". Not in the installed application.                                                                                                          | The same line.                                                                                                                                                                                                 |
- On a phone, each dialog of `Modal` is a bottom sheet, like the drawer. The user drags it down to close it ([Observation drawer](observation-drawer.md#drag-down-to-close)). There are two exceptions. [Settings](settings.md) is a full page. The error screen of `ErrorBoundary` shows after a crash and keeps its buttons.
- The address has the hash of the open page: `#today`, `#chart`, `#calendar` or `#analytics` ([Back button and address](../application-behavior.md#back-button-and-address)).
- The gear (**Settings**) opens [Settings](settings.md) on each screen width.
- On a wide screen, the header keeps its icon buttons until step 4b of RFC 0002. The **Install the app** button shows only on a screen of 1440 pixels or more ([Install](../application-behavior.md#install)).
- The cycle menu of [CyclePicker.tsx](../../../src/components/CyclePicker.tsx) uses the [dialog component](../dialog-component.md). On a wide screen, the menu opens under its button. On a phone, it opens from the bottom of the screen.
- The cycle menu closes with its close button, `Escape`, **Back**, a choice and a click outside the menu. Its backdrop dims the page on a phone only.

### Top bar on a phone

The pages put their controls in the top bar with `InTopBar` and `PageTitle` of [TopBar.tsx](../../../src/components/shell/TopBar.tsx). On a wide screen, the controls stay in the page.

| Page      | Content of the top bar                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today     | The previous day button, the short date (for example "Tue, Oct 27"), the next day button, the cycle picker and the gear. The date opens the date field. |
| Chart     | The cycle picker, **35-day** and **Strip**, the **Chart options** menu (`⋮`) and the gear.                                                              |
| Calendar  | The title **Calendar**, the cycle picker and the gear.                                                                                                  |
| Analytics | The title **Analytics**, the cycle picker and the gear.                                                                                                 |
- On Chart, the cycle picker is first in the DOM too. Thus, the focus order and the reading order are the same as the visual order. The picker has no icon there, so its label fits in French at 360 pixels. On a narrower phone, the label ends in an ellipsis.
- The controls of the bar have 8 pixels between them.
- When the screen goes across 640 pixels, the controls move between the top bar and the page. React then draws them again, so a control in the move loses the focus, and an open chart menu closes.
- The top bar and the bottom bar use `--bg-surface`, with no blur. Thus, the page does not show through them.
- The gear (**Settings**) is the last control of the top bar. It opens [Settings](settings.md).

### Footer

- **Legal** opens **About & Version Tracker** on **System Information**, scrolled to the full legal and medical notice. The version opens the release notes.
- The footer has no install entry. [Settings](settings.md) has **Install app** on each screen width.
- The footer does not print.
- The welcome guide shows the full notice on its first slide.
- The footer is outside `<main>`.

## Accessibility

- The page selector is a `role="tablist"` element. Each tab has `aria-controls` that points to the `role="tabpanel"` element of its page.
- The bottom bar stays a `<nav>` of buttons. The button of the open page has `aria-current="page"`.
- Each page has one `h1`. On a phone, Calendar and Analytics show it in the top bar. Else it is for screen readers only. The logo text is not a heading.
- Each page has this panel in all its states. For example, the empty analytics page has `id="analytics-panel"`.
- The gear is a button with `aria-label="Settings"` and the same `title`.
- The cycle menu has `aria-label="Filter Cycle View"`. Its list of cycles is a `role="listbox"` element. When the menu opens, the focus goes to the selected cycle.

## Implementation

- [src/components/Header.tsx](../../../src/components/Header.tsx)
- [src/components/MobileNav.tsx](../../../src/components/MobileNav.tsx)
- [src/components/Footer.tsx](../../../src/components/Footer.tsx)
- [src/components/shell/TopBar.tsx](../../../src/components/shell/TopBar.tsx)
- [src/components/CyclePicker.tsx](../../../src/components/CyclePicker.tsx)

## Related documents

- [Application behavior](../application-behavior.md)
- [Dialog component](../dialog-component.md)
- [User interface](../user-interface.md)
