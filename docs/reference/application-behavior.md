# Application behavior

This page gives the rules that apply to all the screens. Examples are touch, the **Back** button, updates, keyboard shortcuts and the app icon badge. For the buttons that the user sees, read [User interface](user-interface.md).

## Installed application and touch

**Source files:** [src/styles/base/reset.css](../../src/styles/base/reset.css), [src/styles/base/layout.css](../../src/styles/base/layout.css), [src/styles/views/footer.css](../../src/styles/views/footer.css), [src/utils/launchShortcut.ts](../../src/utils/launchShortcut.ts)

The installed application must behave like the other applications of the device. The installed application has the display mode `standalone`, `fullscreen`, `minimal-ui` or `window-controls-overlay`.

| Behavior          | Rule                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull to refresh   | In an installed display mode, `html` has `overscroll-behavior: none`. A pull at the top of a page does not reload the application, and the page does not bounce. A browser tab keeps the pull to refresh of the browser.                                      |
| Scroll chaining   | Each element that scrolls has `overscroll-behavior: contain`. At its end, the page under it does not scroll.                                                                                                                                                  |
| Tap highlight     | `html` has `-webkit-tap-highlight-color: transparent`. The `:focus-visible` outlines do not change.                                                                                                                                                           |
| Double tap        | Buttons, links, form fields and labels have `touch-action: manipulation`. A double tap does not zoom. Pinch zoom stays available (`maximum-scale=5.0`).                                                                                                       |
| Long press        | Buttons, tabs, the header and the page buttons have `user-select: none` and `-webkit-touch-callout: none`. The text of fields, notes, dialogs and release notes stays selectable.                                                                             |
| Safe areas        | The header adds `env(safe-area-inset-top)` above its height (68 pixels, 54 pixels on a phone), and the left and right insets on its sides. The main content and the page buttons also add the left and right insets. The toasts at the top add the top inset. |
| Space for buttons | `--mobile-nav-height` (62 pixels) and `--mobile-nav-space` (that height and `env(safe-area-inset-bottom)`) are the only values for the page buttons. The body, the toasts and the chart popover use them.                                                     |
| Footer            | In an installed display mode, `footer.css` hides the footer. The version dialog shows the legal notice ([Version dialog](screens/version-dialog.md)).                                                                                                         |

### Launch shortcuts

The manifest has two shortcuts. A long press (or a right click) on the application icon shows them on Android and in Chromium on a computer.

| Shortcut  | URL                 | Result                                                                                                               |
| --------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Log today | `./?shortcut=log`   | The **Today** page, with the observation drawer open on today ([Observation drawer](screens/observation-drawer.md)). |
| Chart     | `./?shortcut=chart` | The **Paper Chart Strip** page.                                                                                      |
- `readLaunchShortcut()` reads the `shortcut` parameter one time, at the start. An unknown value has no effect.
- Then it removes the parameter from the address with `history.replaceState`. Thus, a reload does not open the drawer again.
- At the first visit, the welcome guide opens and **Log today** does not open the drawer under it.
- **Chart** replaces the hash with `#chart`. Thus, a reload keeps the **Paper Chart Strip** page.
- When the window is already open, `listenForLaunches()` gets the shortcut from `window.launchQueue` (Chromium only). The application changes the page or opens the drawer without a reload. When the drawer is already open, **Log today** keeps it and its draft.
- The manifest cannot have a different language for each user. Thus, the shortcut names are in English.

### Back button and address

**Source file:** [src/hooks/useHistoryLayer.ts](../../src/hooks/useHistoryLayer.ts)

**Back** is the back button or back gesture of the device, or the back button of the browser. Each open layer and each page change has one entry in the browser history. A layer is a dialog of [Modal.tsx](../../src/components/Modal.tsx), the observation drawer or the cycle menu.

| Action                                   | Result                                                                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A layer opens                            | The application adds one history entry. Two open layers have two entries.                                                                                               |
| **Back** with a layer open               | Only the top layer closes. It closes as with its close button: the drawer does not keep a draft that its close button does not keep. The focus goes back to the opener. |
| A layer closes with a button or `Escape` | The application removes its entry with `history.go()`. Thus, the next **Back** does not find an old entry.                                                              |
| The page changes                         | The application adds an entry with the hash of the page, for example `#chart`.                                                                                          |
| **Back** with no layer open              | The previous page opens. On the first page, **Back** leaves the application, or goes to the previous site in a browser. The application never stops **Back**.           |
| The user changes the hash                | The page of the hash opens (`hashchange`).                                                                                                                              |
| Reload                                   | The page of the hash opens, with no layer open. An unknown or empty hash opens **Today**.                                                                               |
- `useHistoryLayer(onClose, open)` adds the entry of a layer while `open` is true. `Modal` uses it.
- No other module adds history entries or goes back. `clearLaunchShortcut()` only removes the `shortcut` parameter and keeps the state.
- `useHistoryTab(initialTab)` gives the page and the function that changes it. `App` uses it.
- Each entry of the application has `state.ftLayerDepth`: the number of layers that were open. The application compares it to the open layers after each change, in a microtask.
- Thus, React `StrictMode` does not add two entries. When a layer closes and another opens at the same time, they share one entry. For example, **Restore a backup** closes the welcome guide and opens Settings.
- When the page changes while a layer entry is current, the application first goes back to the entry of the page. Then it adds the entry of the new page and the entries of the layers that stay open.
- At the start, the application reads the current entry:

| Condition                                             | Result                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ftLayerDepth` is above 0 (a reload with layers open) | The application goes back to the entry of the page with `history.go()`. Thus, the next **Back** does not find an old layer entry.                                                    |
| **Else**                                              | The application sets `ftLayerDepth` to 0 with `history.replaceState`. When the hash does not show the first page, it also replaces the hash. An empty hash stays empty on **Today**. |
- The browser does not send the hash to the server. Thus, the service worker gives the application shell offline also for an address with a hash ([Offline use and installation](deployment.md#offline-use-and-installation)).

## Install and update

**Source files:** [src/pwa/installPrompt.ts](../../src/pwa/installPrompt.ts), [src/pwa/registerServiceWorker.ts](../../src/pwa/registerServiceWorker.ts), [src/components/InstallBanner.tsx](../../src/components/InstallBanner.tsx), [src/components/InstallGuideModal.tsx](../../src/components/InstallGuideModal.tsx), [src/components/UpdatePrompt.tsx](../../src/components/UpdatePrompt.tsx)

The application offers installation one time, after it has some data. It never applies a new version while the user works.

### Install

`installPrompt.ts` finds how the browser installs the application:

| Mode     | Condition                                                                                                                                                                                                                                                                                                   | **Install** does                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `prompt` | The browser sent `beforeinstallprompt` (Chromium on Android, Windows, macOS, ChromeOS and Linux). The app prevents the default mini-infobar and keeps the event.                                                                                                                                            | Calls `prompt()` of the event. The event is then used, so the mode becomes `null`. |
| `ios`    | Safari on iOS or iPadOS (also an iPad that shows as `MacIntel` with touch points). Chrome, Firefox, Edge, Opera and Google on iOS (`CriOS`, `FxiOS`, `EdgiOS`, `OPiOS`, `GSA`) give `null`. The in-app browsers of Facebook, Instagram and LINE also give `null`. The guide gives the steps of Safari only. | Opens the guide **Install on iPhone**.                                             |
| `null`   | The application is installed, or the browser cannot install it (Safari on macOS, Firefox). After `appinstalled`, the mode is `null`.                                                                                                                                                                        | Nothing. No button shows.                                                          |
- The application is installed when a display mode of [Installed application and touch](#installed-application-and-touch) matches, or when `navigator.standalone` is true (iOS).
- When the mode is not `null`, [Settings](screens/settings.md) has **Install app** at the top, on each screen width. The header also has an **Install the app** icon button on a screen of 1440 pixels or more. Below that width, the header has no space for it.
- The application does not record if the user installed it.

The install banner is a slim card above the page buttons, at the bottom of the screen. It has the app icon, **Install Fertility Tracker**, one line on the benefits, an **Install** button and a close button (`×`). It is not a dialog, and the page under it stays usable. It shows only when all these conditions are true:

- The install mode is not `null`.
- The user saved 3 observations or more.
- `fertility_tracker_install_banner_closed` is not in `localStorage`.
- No dialog and no drawer is open (`useTopDialog()` is `null`).
- No update is ready. The update message comes first.
- The undo message does not show. It has the same place on the screen ([Undo of replaced data](data-storage.md#undo-of-replaced-data)).

On a phone, **Install** is under the text, so the text keeps its width. While the banner or the update message shows, the body gets a bottom padding of `--install-banner-space`. Thus, the end of the page can scroll above the message.

The close button and **Install** set `fertility_tracker_install_banner_closed`. Then the banner never shows again. The menu entry and the header button stay.

The guide **Install on iPhone** is a dialog of [Modal.tsx](../../src/components/Modal.tsx). At the top, a note says that the installed application has its own storage, separate from Safari. Then it has these steps, in this order:

1. Back up your data, with a **Back up my data** button. The button downloads the JSON backup, as **Back up now** in Settings does ([Settings](screens/settings.md)).
2. Tap **Share** in the toolbar of Safari.
3. Choose **Add to Home Screen**.
4. Open the application and choose **Restore a backup** ([Welcome guide](screens/welcome-guide.md)).

The steps are a numbered list (`<ol>`).

### Update

The service worker of a new version waits ([Offline use and installation](deployment.md#offline-use-and-installation)). The active worker gives the app shell from its own cache. Thus, the page always runs the version of the active worker, also after a normal reload. `registerServiceWorker()` finds a waiting worker when the page already has a controller:

- after the registration, from `registration.waiting`
- when an installing worker gets the state `installed`

The browser checks for a new `sw.js` only when it loads the page. An installed application often comes back from the background without a load. In Chromium, a second launch also shows the open window ([Offline use and installation](deployment.md#offline-use-and-installation)). Thus, when the page becomes visible (`visibilitychange`), `registerServiceWorker()` calls `registration.update()`. It does this at most once a day (`UPDATE_CHECK_INTERVAL_MS`), and the first call comes one day after the load. A failed check, for example offline, has no effect.

The first install has no controller. Thus, it activates at once and the application works offline from the first visit.

| Step                            | Result                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A worker waits                  | `UpdatePrompt` shows **A new version is ready** with a **Reload** button (`role="status"`).                                                                         |
| A dialog or the drawer opens    | The message hides until the dialog closes. Thus, an update never interrupts an entry. It also hides while the undo message shows.                                   |
| **Reload**                      | The page sends `SKIP_WAITING` to the waiting worker. On `controllerchange`, the page reloads one time.                                                              |
| Another window chose **Reload** | The new worker takes control of this window too, but this window does not reload: the user can finish an entry. Its message stays, and its **Reload** only reloads. |
| A newer version installs        | The older waiting worker becomes `redundant`, and the message is for the newer worker.                                                                              |
| No **Reload**                   | The new version starts when all windows of the application are closed and opened again.                                                                             |
- After the reload, `checkAndRecordVersionSeen()` finds the new version, and the version dialog shows its release notes.

## Keyboard shortcuts

**Source files:** [src/hooks/useKeyboardShortcuts.ts](../../src/hooks/useKeyboardShortcuts.ts), [src/domain/keyboardShortcuts.ts](../../src/domain/keyboardShortcuts.ts), [src/components/KeyboardShortcutsModal.tsx](../../src/components/KeyboardShortcutsModal.tsx)

| Key             | Action                                                 | Where          |
| --------------- | ------------------------------------------------------ | -------------- |
| `1` `2` `3` `4` | Open **Today**, **Chart**, **Calendar**, **Analytics** | All pages      |
| `N`             | New observation, as **Log Observation** in the header  | All pages      |
| `←` `→`         | Previous day and next day                              | **Today** page |
| `T`             | The date of today                                      | **Today** page |
| `?`             | Open the **Keyboard shortcuts** dialog                 | All pages      |
- **Ctrl+S** or **⌘S** saves the observation form on the **Today** page and in the drawer. It is not a single-key shortcut, so it also works in a field. **Use keyboard shortcuts** does not turn it off. The dialog on top keeps it: on the **Today** page, no dialog must be open. In the drawer, the drawer must be the dialog on top.
- One `keydown` listener on `document` handles all the shortcuts. `useShortcut(id, handler)` adds a handler while its component is mounted. When two components add the same shortcut, the last one handles it, until it unmounts. `App` adds the pages, `N` and `?`. `TodayView` adds the arrows and `T`.
- [keyboardShortcuts.ts](../../src/domain/keyboardShortcuts.ts) finds the shortcut of a key event:
  - A key with `Ctrl`, `Meta` or `Alt`, or a key of an input method composition, is not a shortcut. Thus, the shortcuts of the browser and the system stay, and `Ctrl+P` prints the report.
  - The digits use `event.key`. When the key types a different character, they also use `event.code` (`Digit1` to `Digit4`). Thus, they also work on a French AZERTY keyboard without `Shift`.
  - `Shift` with a digit key that types a different character, for example `!` on a US keyboard, is not a shortcut.
  - A key that is not a character keeps its own meaning. For example, `4` of the number pad without Num Lock is `←`.
  - The letters ignore the case. On a keyboard without Latin letters, for example Cyrillic, `N` and `T` use `event.code` (`KeyN`, `KeyT`).
- A shortcut does nothing in these cases:
  - A dialog is open (`dialog[open]`), for example the drawer or Settings.
  - The focus is in an input, a text area, a select or an editable element.
  - For `←` and `→` only: the focus is in a widget that uses the arrow keys. These roles are such widgets: `listbox`, `grid`, `menu`, `menubar`, `radiogroup`, `slider` and `tree`. The page tabs do not use the arrows, so the arrows change the day there.
  - Another handler already used the key (`event.defaultPrevented`).
  - The page of the shortcut is not open. For example, `←` does nothing on the chart page.
- The **Keyboard shortcuts** dialog lists each shortcut with its translated action, and then **Ctrl+S** and **⌘S**. Its checkbox **Use keyboard shortcuts** turns all the shortcuts on or off (WCAG 2.1.4). The application saves the choice in `fertility_tracker_shortcuts_off`. The shortcuts are on by default.
- These open the dialog: `?`, **Keyboard shortcuts** in the **Help** group of Settings, and the **Keyboard shortcuts** button of the **About & Version Tracker** dialog. When the shortcuts are off, `?` does nothing, and the buttons stay.
- The **Use keyboard shortcuts** switch of Settings and the checkbox of the **Keyboard shortcuts** dialog change the same choice.
- These buttons have a shortcut: the page tabs, **Log Observation**, the day arrows and **Jump to Today**. When the shortcuts are on, their `title` tooltip shows the key, for example **Log Observation (N)**. They also have `aria-keyshortcuts`. When the shortcuts are off, the buttons do not show the keys.

## Page slide

**Source files:** [src/utils/viewTransition.ts](../../src/utils/viewTransition.ts), [src/hooks/useHistoryLayer.ts](../../src/hooks/useHistoryLayer.ts), [src/styles/views/page-transition.css](../../src/styles/views/page-transition.css)

- A page change slides the page in 180 ms. The page order is **Today**, **Chart**, **Calendar**, **Analytics**. A page on the right comes from the right, and a page on the left comes from the left.
- All page changes use `setActiveTab` of `useHistoryLayer`: the tabs, the bottom bar, the shortcuts, the hash and **Back**. Thus, **Back** slides back to the left page.
- `runViewTransition(update, direction)` calls `document.startViewTransition`. The update renders in it with `flushSync`. The direction is `data-page-transition` on the root element until the transition ends.
- During a page change, the page area (`.page-view`) has a `view-transition-name`. The header and the bottom bar have their own names and stay in place, above the page. The rest of the screen changes at once.
- The names are only there during a page change. A name makes a stacking context. With it, a toast of the page cannot go above the drawer.
- All the parts of the transition take 180 ms, also the root. Thus, the page takes clicks again after 180 ms.
- The module keeps two values. `activeTab` changes at once, for the history and the direction. The page that React shows changes only in the transition, after the browser has captured the old page.
- In these cases, the page changes at once, as before this feature:
  - The browser has no View Transitions API.
  - The user prefers reduced motion (`prefers-reduced-motion: reduce`).
  - The browser animates **Back** itself (`hasUAVisualTransition`), for example the swipe back of Safari.
  - The **Analytics** page has not shown yet. Its lazy component shows the loading status first, and a slide to it would show the loading status.
- An observation that opens from the chart or the calendar keeps the slide of the drawer ([Observation drawer](screens/observation-drawer.md)). It has no shared-element transition.

## App icon badge

**Source files:** [src/pwa/appBadge.ts](../../src/pwa/appBadge.ts), [src/components/AppBadgeSetting.tsx](../../src/components/AppBadgeSetting.tsx)

- The badge has these states. Demo data does not count as an observation.

| Condition                | Result                                     |
| ------------------------ | ------------------------------------------ |
| The badge is off         | The application removes the dot.           |
| Today has no observation | The icon of the installed app shows a dot. |
| **Else**                 | The application removes the dot.           |
- The dot is `navigator.setAppBadge()` with no number. It never shows a number or data of the cycle. `navigator.clearAppBadge()` removes it.
- The badge is off by default. The switch **App icon badge** turns it on or off. It is in the **Appearance and input** group of [Settings](screens/settings.md). Its detail is "Show a dot on the app icon when today has no observation". The application saves the choice in `fertility_tracker_badge_on`.
- The switch shows only when the browser has the Badging API. The dot changes only while the app is open.
- In the web apps of WebKit (iOS, iPadOS and the Dock of macOS), the badge needs the permission for notifications. When the user turns the badge on there, the application asks for the permission. On Apple systems, the detail of the switch also tells why. The application never sends notifications.
- While the system asks, the switch is disabled, so a second tap does not ask again. A request that fails is a refusal.
- If the user refuses the permission, the badge stays off, and a message tells how to allow it in the settings of the system.
- `useAppBadge(observations)` in `App` updates the badge in these cases:
  - When the app starts.
  - After each change of the observations, for example a save, a delete or a restore.
  - When the date changes while the app is open. The application looks for a new date each minute, not with a timer to midnight. A timer stops while the computer sleeps, and the time zone can change.
  - When the app shows again (`visibilitychange`).
- All the calls do nothing when the browser has no Badging API or the app is not installed. A refused call does nothing too.
- Without a server, the dot changes only while the app runs. If the user does not open the app on a day, the icon keeps the state of the last update.

## Haptic feedback

**Source file:** [src/utils/haptics.ts](../../src/utils/haptics.ts)

- `haptic(kind)` gives a short vibration with `navigator.vibrate`. A `light` vibration is 10 ms. A `success` vibration is 15 ms.
- Only three actions vibrate:
  - A save of an observation, on the **Today** page or in the drawer: `success`.
  - A tap on the **Designate Peak Day (P)** switch, on the **Today** page or in the drawer: `light`.
  - A tap on the **Log** button of the phone navigation bar: `light`.
- No other action vibrates. More vibrations make the signal less useful.
- `haptic` does nothing in these cases:
  - The browser has no Vibration API. Safari on iOS and iPadOS has none, so these devices never vibrate.
  - The user prefers reduced motion (`prefers-reduced-motion: reduce`).
  - The user turned the vibrations off.
- A vibration that the browser refuses does nothing.
- The vibrations are on by default. The **Vibration** switch in the **Appearance and input** group of [Settings](screens/settings.md) turns them off or on. The switch shows only when the browser has the Vibration API. The application saves the choice in `fertility_tracker_haptics_off`.
- The choice stays in memory when the browser cannot save it.

## Desktop title bar and backup files

**Source files:** [public/manifest.webmanifest](../../public/manifest.webmanifest), [src/styles/views/header.css](../../src/styles/views/header.css), [src/utils/launchShortcut.ts](../../src/utils/launchShortcut.ts), [src/App.tsx](../../src/App.tsx), [src/components/settings/SettingsDialog.tsx](../../src/components/settings/SettingsDialog.tsx)

Only Chromium browsers on a computer (Chrome and Edge) have these two functions. Elsewhere, nothing changes.

### Title bar

- The manifest has `display_override: ["window-controls-overlay", "standalone"]`. The installed app on a computer puts its header in the title bar.
- In `@media (display-mode: window-controls-overlay)`, the header uses `env(titlebar-area-x)`, `env(titlebar-area-width)` and `env(titlebar-area-height)`. The padding keeps the buttons away from the window controls.
- An empty part of the header moves the window (`app-region: drag`). Buttons, links, fields and tabs do not (`app-region: no-drag`).
- While a dialog is open, no part of the header moves the window. Thus, a click on a dialog in front of the header stays a click.
- The dialogs and the drawer start below the title bar. Thus, the window controls never cover a close button.
- A window of 640 pixels or less keeps the 54-pixel height of the phone header.
- The user can turn the overlay off with the button of the browser in the title bar. The media query then stops, and the header goes back to its usual layout.
- A phone and a browser tab never match this media query.

### Open a backup file with the app

- The manifest has one `file_handlers` entry. It accepts only `.ftbackup`, never `.json`. Its `action` is `./?restore=file`.
- A double click on a `.ftbackup` file, or **Open with** Fertility Tracker, opens the app. The manifest asks for `focus-existing`, so an open window gets the file.
- `listenForLaunches()` sets the one consumer of `window.launchQueue` for the shortcuts and for the files. It reads the first file and gives its text to `App`. A file that the app cannot read gives an empty text.
- `App` opens [Settings](screens/settings.md) with the text. Settings uses the same steps as **Restore from a file**: the preview, the confirmation and the undo copy. A file that is not a valid backup shows `exportModal.importError`.
- `clearLaunchShortcut()` removes `restore` from the address. Only the launch queue gives a file: the parameter alone opens nothing.

## Related documents

- [User interface](user-interface.md)
- [Deployment](deployment.md)
- [Data storage](data-storage.md)
