# Navigation

This page gives the rules for the header, the page buttons, the footer, the phone menu and the cycle menu.

## Behavior

The application has four pages, a header, a statistics bar, an observation drawer and dialogs. A phone screen is 640 pixels wide or less.

| Part                                                                  | Wide screen                                                                                                                                                                            | Phone screen                                                                                                          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Header ([Header.tsx](../../../src/components/Header.tsx))             | Logo, page tabs, cycle picker, **Log Observation**, export, guide, version, language (`en`, `fr`) and theme buttons. The header is 68 pixels high, and the buttons are 42 pixels high. | Logo (sprout), cycle picker and a menu button (`⋮`). The buttons are 38 pixels high. The other buttons are in a menu. |
| Page buttons ([MobileNav.tsx](../../../src/components/MobileNav.tsx)) | In the header                                                                                                                                                                          | Fixed at the bottom, with a **+** button for a new observation                                                        |
| Dialogs                                                               | Centered                                                                                                                                                                               | Open from the bottom, with 24-pixel top corners, a maximum height of `88dvh`, and a fixed header and footer           |
| Footer ([Footer.tsx](../../../src/components/Footer.tsx))             | Legal text, **Install app** (when the browser can install the application), **User Guide** button and version button. Not in the installed application.                                | The copyright and the buttons are on separate lines. Not in the installed application.                                |
- On a phone, each dialog of `Modal` is a bottom sheet, like the drawer. The user drags it down to close it ([Observation drawer](../../../SPEC.md#57-observation-drawer)). The error screen of `ErrorBoundary` is the only exception: it shows after a crash and keeps its buttons.
- The address has the hash of the open page: `#today`, `#chart`, `#calendar` or `#analytics` ([Back button and address](../application-behavior.md#back-button-and-address)).
- The phone menu uses the [dialog component](../dialog-component.md). It opens from the bottom of the screen.
- The cycle menu of [CyclePicker.tsx](../../../src/components/CyclePicker.tsx) uses the [dialog component](../dialog-component.md). On a wide screen, the menu opens under its button. On a phone, it opens from the bottom of the screen.
- The cycle menu closes with its close button, `Escape`, **Back**, a choice and a click outside the menu. Its backdrop dims the page on a phone only.

## Accessibility

- The page selector is a `role="tablist"` element. Each tab has `aria-controls` that points to the `role="tabpanel"` element of its page.
- Each page has this panel in all its states. For example, the empty analytics page has `id="analytics-panel"`.
- The phone menu has `aria-label="Mobile Navigation Menu"`.
- The cycle menu has `aria-label="Filter Cycle View"`. Its list of cycles is a `role="listbox"` element. When the menu opens, the focus goes to the selected cycle.

## Implementation

- [src/components/Header.tsx](../../../src/components/Header.tsx)
- [src/components/MobileNav.tsx](../../../src/components/MobileNav.tsx)
- [src/components/Footer.tsx](../../../src/components/Footer.tsx)
- [src/components/CyclePicker.tsx](../../../src/components/CyclePicker.tsx)

## Related documents

- [Application behavior](../application-behavior.md)
- [Dialog component](../dialog-component.md)
- [User interface](../user-interface.md)
