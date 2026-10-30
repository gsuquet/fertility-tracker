# Check the layout on real devices

Do these checks before a release that changes the layout. The automatic tests cannot do them. They need a real phone, a screen reader or an installed application. The automatic checks are in [Layout checks](../reference/layout-checks.md).

## Before you start

- Open the application from the deployed address, or from `npm run preview` on the same network.
- In **Settings**, load the demo data. After the checks, delete the demo data.
- Write each problem in an issue, with the device, the browser, the language and a screenshot.

## Check a phone

Do these steps on an iPhone with Safari and on an Android phone with Chrome.

1. Open each page: **Today**, **Chart**, **Calendar** and **Analytics**. Make sure that no page scrolls to the side.
2. On **Today**, open a group row and select a chip. Make sure that **Save** stays above the bottom bar.
3. Tap in the code field. Make sure that the keyboard does not hide the field. Make sure that **Save** hides while the keyboard is open.
4. Swipe to the left and to the right on **Today**. Make sure that the day changes. Swipe in the chips. Make sure that the day does not change.
5. Tap **+**. Make sure that the observation sheet opens. Drag its handle down to close it.
6. On **Chart**, scroll the strip. Make sure that the cell of today shows when the page opens.
7. In **Settings**, change the language to French. Do steps 1 to 6 again. Make sure that no label is cut in the middle of a word.

## Check the installed application

1. Install the application from the browser menu. Use **Add to Home Screen** on iOS. Use **Install app** on Android and on a computer.
2. Open the installed application. Make sure that the footer does not show. Make sure that the top bar is below the status bar.
3. On a computer with Chrome or Edge, select the window controls overlay (the chevron in the title bar). Make sure that the top bar does not go below the window buttons.

## Check with a screen reader

Do these steps with VoiceOver on iOS and with TalkBack on Android.

1. On **Today**, move through the page. Make sure that the reader says the page title, the date, the cycle day and **Saved** or **Not saved**.
2. Open a group row. Make sure that the reader says "expanded", and that the focus goes to the selected chip.
3. Select a chip and save. Make sure that the reader says the save message.
4. Move to the bottom bar. Make sure that the reader says "current page" on the open page.
5. On **Chart**, move to a day card. Make sure that the reader says the date, the cycle day and the code.

## Result

Each problem has an issue. When each check passes, write the date, the devices and the version in the pull request or the issue of the release.

## Related documents

- [Layout checks](../reference/layout-checks.md)
- [Navigation](../reference/screens/navigation.md)
- [Today page](../reference/screens/today.md)
- [Paper Chart Strip page](../reference/screens/chart.md)
