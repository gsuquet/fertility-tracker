# Dialog component

This page gives the rules of `Modal.tsx`, the dialog component that each dialog, the drawer and the menus use.

## Rules

[Modal.tsx](../../src/components/Modal.tsx) is the only dialog component. `ExportModal`, `VersionModal`, `WelcomeModal`, `CycleStartModal`, `ObservationDrawer`, `ConfirmDialog`, `InstallGuideModal`, `KeyboardShortcutsModal`, `ErrorBoundary`, the phone menu and the cycle menu use it. No other component has a focus trap or an `Escape` handler for a dialog.

| Function       | Rule                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Element        | A native `<dialog>` in a portal on `document.body`, opened with `showModal()`. The browser makes the page under it inert.                             |
| Name           | `aria-modal="true"`, and a name from `aria-labelledby` (the title) or `aria-label`. `aria-describedby` is optional.                                   |
| First focus    | The element of `initialFocusRef`, else the first element that can get the focus. The `<dialog>` itself does not scroll to it.                         |
| Focus trap     | `Tab` on the last element goes to the first. `Shift+Tab` on the first goes to the last.                                                               |
| Two dialogs    | The dialog on top keeps the focus. The dialog under it ignores the keys.                                                                              |
| `Escape`       | Calls `onClose` of the top dialog only. The event does not go to the dialog under it or to the document.                                              |
| `cancel` event | Calls `onClose`. It does not close the `<dialog>` itself, so React state always controls the dialog.                                                  |
| Backdrop       | A click on the `<dialog>` outside the panel calls `onClose`. A click in the panel does not.                                                           |
| Back           | **Back** calls `onClose` of the top dialog only, with `useHistoryLayer` ([Back button and address](application-behavior.md#back-button-and-address)). |
| Focus return   | On close, it calls `close()`, then moves the focus back to the element that had it before.                                                            |
| Listeners      | `keydown` and `click` are native listeners on the `<dialog>`. Thus, they also get events from portals, such as the undo message.                      |
| Scroll area    | A body that scrolls is a `<section>` with `tabIndex={0}` and `aria-labelledby` (role `region`).                                                       |

### Undo message in a dialog

`useTopDialog()` gives the open `<dialog>` on top, or `null`. `showModal()` makes all the page outside the dialog inert, also a `popover` element. Thus, while a dialog is open, `UndoToast` goes into the top dialog with a portal.

- In a dialog, the undo message stays visible, and **Undo** and **Delete the copy** stay available. The focus trap includes them.
- After **Undo** or **Delete the copy** in a dialog, the focus goes to the top dialog. When the dialog closes, the message goes back to the page.
- In the phone menu, the undo message shows at the top of the screen. Thus, it does not cover the menu.

## Related documents

- [Application behavior](application-behavior.md)
- [Navigation](screens/navigation.md)
