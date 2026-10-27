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

## Header buttons

| Button                             | Phone location      | Action                                              |
| ---------------------------------- | ------------------- | --------------------------------------------------- |
| Cycle picker                       | Header              | Selects one cycle or **All Cycles**.                |
| **Log Observation**                | **+** at the bottom | Opens the observation drawer.                       |
| **Practitioner PDF / PNG**         | Menu                | Opens the export and backup dialog.                 |
| **Welcome to Fertility Tracker**   | Menu                | Opens the welcome guide.                            |
| **About & Version Tracker**        | Menu                | Opens the release notes and the storage data.       |
| Language button (**EN** or **FR**) | Menu                | Changes the language.                               |
| Theme button                       | Menu                | Changes between the light theme and the dark theme. |

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

| Button                  | Action                                                     |
| ----------------------- | ---------------------------------------------------------- |
| **Single Cycle**        | Prints one cycle.                                          |
| **Multiple Cycles**     | Prints the selected cycles.                                |
| **Print / Save as PDF** | Opens the print dialog of the browser.                     |
| **Backup Data (JSON)**  | Downloads all observations in a JSON file.                 |
| **Restore Data (JSON)** | Replaces all observations with the content of a JSON file. |
| **Load Demo Cycle**     | Replaces all observations with two demo cycles.            |
| **Clear Data / Reset**  | Deletes all observations after a confirmation.             |

## Unreadable data notice

The notice shows above the pages when the application cannot read the saved observations. It shows until you delete the copy or close the notice.

| Button                       | Action                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| **Download unreadable data** | Downloads the original data in a text file.                                  |
| **Delete the copy**          | Deletes the copy of the original data and closes the notice.                 |
| **Close**                    | Closes the notice. This button shows when the application has no new copy.   |

## Dialogs

| Dialog                      | When it opens                                                         |
| --------------------------- | --------------------------------------------------------------------- |
| Welcome guide               | At the first visit, and from the header.                              |
| **New Cycle Start?**        | When you save the first day of bleeding after a day without bleeding. |
| **About & Version Tracker** | From the header.                                                      |

## Related documents

- [Record an observation](../how-to/record-an-observation.md)
