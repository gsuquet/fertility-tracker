# User interface

This page lists the pages, buttons and dialogs of the application. The names are the English names. The French names are in `src/i18n/locales/fr.ts`.

## Pages

| Page                  | Phone name    | Content                                                                      |
| --------------------- | ------------- | ---------------------------------------------------------------------------- |
| **Today**             | **Today**     | The observation form for one date, the stamp preview and the last five days. |
| **Paper Chart Strip** | **Chart**     | One row for each cycle, in the format of the Creighton paper chart.          |
| **Monthly Calendar**  | **Calendar**  | One month, with the stamp and the code of each day.                          |
| **Cycle Analytics**   | **Analytics** | Phase lengths, the mucus score, the stamp counts and a clinical summary.     |

On a screen of 640 pixels or less, the page buttons are at the bottom of the screen.

The address shows the open page: `#today`, `#chart`, `#calendar` or `#analytics`. After a reload, the same page opens. **Back** (the back button or the back gesture) opens the previous page. On the first page, **Back** leaves the application.

## Header buttons

| Button                             | Phone location      | Action                                              |
| ---------------------------------- | ------------------- | --------------------------------------------------- |
| Cycle picker                       | Header              | Selects one cycle or **All Cycles**.                |
| **Log Observation**                | **+** at the bottom | Opens the observation drawer on today.              |
| **Practitioner PDF / PNG**         | Menu                | Opens the export and backup dialog.                 |
| **Welcome to Fertility Tracker**   | Menu                | Opens the welcome guide.                            |
| **About & Version Tracker**        | Menu                | Opens the release notes and the storage data.       |
| Language button (**EN** or **FR**) | Menu                | Changes the language.                               |
| Theme button                       | Menu                | Changes between the light theme and the dark theme. |

## App icon badge

In the installed app, the icon can show a dot while today has no observation. The badge is off by default.

To turn it on, open **About & Version Tracker**, then **System Information**. Select **Show a dot on the app icon when today has no observation**. The checkbox shows only when the browser can show a badge.

On iPhone, iPad and Mac, the system asks for the permission for notifications. The app never sends notifications. The dot changes only while the app is open.

## Change the page

The page slides when it changes. A page on the right comes from the right, and a page on the left comes from the left. With reduced motion in the settings of the system, the page changes at once.

## Change the day

On the **Today** page, the arrow buttons open the previous day and the next day. On a touch screen, you can also swipe. Swipe to the left to open the next day. Swipe to the right to open the previous day. A swipe that starts in a field does not change the day.

On the **Monthly Calendar** page, swipe to the left to open the next month and to the right to open the previous month. A swipe does not open a month after the current month.

## Keyboard shortcuts

On a computer, one key starts an action. A shortcut does nothing while a dialog is open or while the focus is in a field.

| Key             | Action                                                     |
| --------------- | ---------------------------------------------------------- |
| `1` `2` `3` `4` | Opens **Today**, **Chart**, **Calendar** or **Analytics**. |
| `N`             | Logs a new observation, as **Log Observation**.            |
| `←` `→`         | Opens the previous day or the next day on **Today**.       |
| `T`             | Opens the date of today on **Today**.                      |
| `?`             | Opens the **Keyboard shortcuts** dialog.                   |

To turn the shortcuts off, clear **Use keyboard shortcuts** in the **Keyboard shortcuts** dialog. The footer, the phone menu and the **About & Version Tracker** dialog open it too.

## Observation form

The **Today** page and the observation drawer have the same fields.

| Field or button                  | Use                                                                    |
| -------------------------------- | ---------------------------------------------------------------------- |
| **Entry Mode**                   | **Direct Code Only** or **Detailed Form**. Only on the **Today** page. |
| **Direct Code Entry**            | Type the full code, for example `10KLX3 I`.                            |
| **Bleeding (Flux)**              | One bleeding code.                                                     |
| **Start of New Cycle**           | Shows only on a day with bleeding. Sets the start of a cycle.          |
| **Mucus Intensity / Stretch**    | One stretch code.                                                      |
| **Appearance / Characteristics** | One or more appearance codes.                                          |
| **Frequency**                    | One frequency code.                                                    |
| **Contextual Symptoms**          | One or more symptom codes.                                             |
| **I - Sexual Intercourse**       | Records intercourse.                                                   |
| **Designate Peak Day (P)**       | Sets this day as the Peak Day.                                         |
| **Notes / Observations**         | Free text.                                                             |
| **Stamp Preview**                | Shows the stamp of the day before you save.                            |
| **Save Observation**             | Saves the day.                                                         |
| **Delete Entry**                 | Deletes the day. Shows only for a saved day.                           |

## Export and backup dialog

| Button                  | Action                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Single Cycle**        | Prints one cycle.                                                                                                |
| **Multiple Cycles**     | Prints the selected cycles.                                                                                      |
| **Print / Save as PDF** | Opens the print dialog of the browser.                                                                           |
| **Backup Data**         | Downloads all observations in a `.ftbackup` file. The file is plain JSON.                                        |
| **Restore Data**        | Replaces or merges the observations with a `.ftbackup` or `.json` backup file. Asks first if observations exist. |
| **Load Demo Cycle**     | Replaces all observations with two demo cycles. Asks first if observations exist.                                |
| **Clear Data / Reset**  | Deletes all observations after a confirmation. It is disabled when no observations exist.                        |

If the file is not a valid backup, the dialog shows an error. The observations do not change.

## Confirmation dialog

The confirmation dialog opens before an action replaces or deletes data. The focus starts on **Cancel** and stays in the dialog when you press `Tab`. For a backup file, the dialog shows the number of observations in the file and the first and last date.

| Dialog                               | Opens from                                        | Button that continues    |
| ------------------------------------ | ------------------------------------------------- | ------------------------ |
| **Restore this backup?**             | **Restore Data**                                  | **Merge** or **Replace** |
| **Replace your data with the demo?** | **Load Demo Cycle**                               | **Load the demo**        |
| **Delete all chart data?**           | **Clear Data / Reset**                            | **Delete all data**      |
| **Delete the unreadable data?**      | **Delete the copy** in the unreadable data notice | **Delete the copy**      |

**Cancel**, the `Escape` key and a click outside the dialog close it. The data does not change.

## Undo toast

The undo toast shows at the bottom of the page after a restore, a demo load or a delete of all data. It also shows after a reload if the copy of the old observations is still in the browser. It stays until you click a button, or until you save or delete an observation. If you make two changes, **Undo** puts back the observations from before the first change. If the browser cannot save the copy, the toast says that **Undo** works only until you reload the page. When a dialog is open, the toast shows above the dialog, and you can click its buttons or move to them with `Tab`.

| Button              | Action                                                         |
| ------------------- | -------------------------------------------------------------- |
| **Undo**            | Puts back the observations from before the change.             |
| **Delete the copy** | Keeps the change and deletes the copy of the old observations. |

## Unreadable data notice

The notice shows above the pages when the application cannot read the saved observations. It shows until you delete the copy or close the notice.

| Button                       | Action                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| **Download unreadable data** | Downloads the original data in a text file.                                              |
| **Delete the copy**          | Asks for confirmation. Then deletes the copy of the original data and closes the notice. |
| **Close**                    | Closes the notice. This button shows when the application has no new copy.               |

## Dialogs

| Dialog                      | When it opens                                                         |
| --------------------------- | --------------------------------------------------------------------- |
| Welcome guide               | At the first visit, and from the header.                              |
| **New Cycle Start?**        | When you save the first day of bleeding after a day without bleeding. |
| **About & Version Tracker** | From the header.                                                      |

All the dialogs, the observation drawer, the mobile menu and the cycle menu use the same keyboard rules:

| Key or action              | Result                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| The dialog opens           | The focus goes to the first button of the dialog, or to the selected cycle in the cycle menu. |
| `Tab` and `Shift+Tab`      | The focus moves through the dialog only. It does not go to the page.                          |
| `Escape`                   | Closes the top dialog only. A dialog under it stays open.                                     |
| A click outside the dialog | Closes the dialog.                                                                            |
| **Back**                   | Closes the top dialog only.                                                                   |
| The dialog closes          | The focus goes back to the button that opened the dialog.                                     |

On a phone, you can also drag the observation drawer, the mobile menu and the cycle menu down to close them. Drag the handle, the header, or the list when it is at the top. A short drag puts the sheet back. A swipe on these sheets does not scroll the page behind them.

## Installed application

You can install the application on a phone or a computer. The installed application has these differences:

| Function             | Installed application                                                                   |
| -------------------- | --------------------------------------------------------------------------------------- |
| Footer               | Not shown. **About & Version Tracker** > **System Information** shows the legal notice. |
| Pull down at the top | Does not reload the application.                                                        |
| **Log today**        | Shortcut of the app icon. Opens the observation drawer on today.                        |
| **Chart**            | Shortcut of the app icon. Opens the **Paper Chart Strip** page.                         |

Touch and hold the app icon (or right-click it on a computer) to see the shortcuts. The shortcuts are available on Android and in Chrome or Edge on a computer.

### Install the application

When the browser can install the application, the phone menu has **Install app**. The footer also has **Install app**. On a screen of 1440 pixels or more, the header also has an **Install the app** button (a phone icon). After you save 3 observations, a small message at the bottom of the screen also offers the installation. The message shows one time only. Its close button (`×`) and **Install** remove it.

| Browser                                                     | **Install** does                                                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Chrome or Edge on Android or a computer                     | Shows the install dialog of the browser.                                                                         |
| Safari on iPhone or iPad                                    | Opens **Install on iPhone**. Back up your data, add the application to the Home Screen, then restore the backup. |
| Firefox, Safari on a computer, or another browser on iPhone | No install button.                                                                                               |

On iPhone and iPad, the installed application does not share its data with Safari. The welcome guide of the installed application has **Restore a backup** when it has no data.

### New version

When a new version is ready, the message **A new version is ready** shows with a **Reload** button. The message does not show while a dialog or the observation drawer is open. If you do not choose **Reload**, the new version starts the next time that you open the application.

## Error message

If a page or a dialog cannot load, the application shows the message **This part did not load** in its place. The header and the footer stay available. Click **Reload** to load the page again. Your observations stay in the browser.

## Related documents

- [Record an observation](../how-to/record-an-observation.md)
