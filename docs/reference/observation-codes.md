# Observation codes

This page lists the codes that the application accepts for one day of observation. The codes come from the Creighton Model FertilityCare System (CrMS). The source of the lists is `src/types/crms.ts`.

## Code string

The application writes the code of a day in this sequence:

| Part        | Example | Rule                                                                   |
| ----------- | ------- | ---------------------------------------------------------------------- |
| Bleeding    | `M`     | Optional. A space comes after it.                                      |
| Mucus       | `10KL`  | The stretch code, then the appearance codes.                           |
| Frequency   | `X3`    | Directly after the mucus code. If there is no mucus code, it is alone. |
| Intercourse | `I`     | Optional. A space comes before it.                                     |
| Symptoms    | `AP`    | Optional. Each symptom code is a token. A space comes before it.       |

Examples: `M`, `0AD`, `10KLX3 I AP`, `L 6CX1`.

In **Direct Code Entry**, the parser accepts lowercase letters and extra spaces. The parser gives the same fields back from each code string that the application writes.

The cells of the **Paper Chart** and the print layout show the symptoms in a tag below the code. They do not show the symptoms in the code.

Data from versions before 1.15.8 can have a stored code string without the symptoms. When the application loads this data, it adds the missing symptom codes to the end of the code string.

## Bleeding codes

| Code | Meaning                 | In Direct Code Entry                                                                               |
| ---- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `H`  | Heavy flow              | Yes                                                                                                |
| `M`  | Moderate flow           | Yes                                                                                                |
| `L`  | Light flow              | Yes                                                                                                |
| `VL` | Very light flow         | Yes                                                                                                |
| `B`  | Brown or black bleeding | No. Use the **Detailed Form** buttons. In Direct Code Entry, `B` is the appearance code for brown. |

## Stretch codes

| Code   | Meaning                          | Fertile mucus |
| ------ | -------------------------------- | ------------- |
| `0`    | Dry                              | No            |
| `2`    | Damp without lubrication         | No            |
| `2W`   | Wet without lubrication          | No            |
| `4`    | Shiny without lubrication        | No            |
| `6`    | Slightly stretchy (about 0.5 cm) | Yes           |
| `8`    | Moderately stretchy (1 to 2 cm)  | Yes           |
| `10`   | Very stretchy (2.5 cm or more)   | Yes           |
| `10DL` | Damp with lubrication            | Yes           |
| `10SL` | Shiny with lubrication           | Yes           |
| `10WL` | Wet with lubrication             | Yes           |

## Appearance codes

| Code  | Meaning                | Fertile mucus |
| ----- | ---------------------- | ------------- |
| `B`   | Brown blood            | No            |
| `C`   | Cloudy or white        | No            |
| `C/K` | Cloudy and clear mixed | Yes           |
| `G`   | Gummy or sticky        | No            |
| `K`   | Clear                  | Yes           |
| `L`   | Lubricative            | Yes           |
| `P`   | Pasty or creamy        | No            |
| `Y`   | Yellow                 | No            |

A day has fertile mucus if its stretch code or one of its appearance codes is fertile.

## Frequency codes

| Code | Meaning                           |
| ---- | --------------------------------- |
| `X1` | Seen one time in the day          |
| `X2` | Seen two times in the day         |
| `X3` | Seen three times in the day       |
| `AD` | Seen all day (four or more times) |

## Symptom and intercourse codes

| Code  | Meaning              |
| ----- | -------------------- |
| `AP`  | Abdominal pain       |
| `RAP` | Right abdominal pain |
| `LAP` | Left abdominal pain  |
| `I`   | Sexual intercourse   |

## Related documents

- [Stamp and Peak Day rules](stamp-and-peak-rules.md)
- [Record an observation](../how-to/record-an-observation.md)
