# Layout checks

This page lists the automatic layout checks and the layout captures of [RFC 0002](../records/rfcs/0002-phone-first-redesign.md). The test files are `e2e/phoneLayout.spec.ts` and `e2e/layoutCaptures.spec.ts`. The manual checks on real devices are in [Check the layout on real devices](../how-to/check-the-layout-on-real-devices.md).

## Phone rules

The `phone` project of `playwright.config.ts` runs `e2e/phoneLayout.spec.ts` on a screen of 390 by 844 pixels, with touch. The `chromium` project does not run this file. The test opens the demo data in English and in French.

| Check        | Pages                                                                          | Rule                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Width        | Today, Chart, Calendar, Analytics, Settings                                    | The page and its main part are not wider than the screen. A strip that scrolls inside the page is correct.                                                                                |
| Text size    | Today, Chart, Calendar, Analytics, Settings                                    | No visible text is smaller than 11 pixels.                                                                                                                                                |
| Text size    | The cycle picker, the actions menu, the observation sheet and the chart legend | No visible text is smaller than 11 pixels.                                                                                                                                                |
| Current page | Today, Chart, Calendar, Analytics                                              | The button of the bottom bar for the open page has `aria-current="page"`.                                                                                                                 |
| Controls     | Today                                                                          | These controls are 44 by 44 pixels or more: the buttons of the bottom bar, **+**, the day buttons and **Save**. Each group row and each chip of an open group are also 44 pixels or more. |

## Captures

`mise run screenshots` runs `e2e/layoutCaptures.spec.ts` with `SCREENSHOTS=1`. The test saves the captures in `docs/reference/screens/images/checks/`. Without `SCREENSHOTS=1`, the file has no test.

| Capture                         | Files                                                                                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Each page at 1024 by 768 pixels | [today-1024.png](screens/images/checks/today-1024.png), [chart-1024.png](screens/images/checks/chart-1024.png), [calendar-1024.png](screens/images/checks/calendar-1024.png), [analytics-1024.png](screens/images/checks/analytics-1024.png)                                 |
| Each phone page in French       | [today-phone-fr.png](screens/images/checks/today-phone-fr.png), [chart-phone-fr.png](screens/images/checks/chart-phone-fr.png), [calendar-phone-fr.png](screens/images/checks/calendar-phone-fr.png), [analytics-phone-fr.png](screens/images/checks/analytics-phone-fr.png) |
| The installed application       | [today-installed-phone.png](screens/images/checks/today-installed-phone.png), [chart-installed-wide.png](screens/images/checks/chart-installed-wide.png)                                                                                                                     |
- At 1024 pixels, the top bar is wider than the screen. Step 4b of RFC 0002 changes the top bar. These captures show the layout before that step.
- The browser cannot emulate `display-mode`. Thus, the test turns on each `@media (display-mode: standalone)` block where it is, in the same layer and order. The window controls overlay needs the title bar of the operating system, so only a real device can show it.

## Related documents

- [Check the layout on real devices](../how-to/check-the-layout-on-real-devices.md)
- [Test rules and helpers](test-rules.md)
- [Design system](design-system.md)
- [ADR 0006: Screen layout snapshots and screenshots](../records/adrs/0006-screen-layout-snapshots-and-screenshots.md)
