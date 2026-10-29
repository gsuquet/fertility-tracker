# Documentation rules

This page gives the rules for the pages in `docs/`, `README.md`, `AGENTS.md` and `SPEC.md`. The docs check (`mise run docs`) finds a part of the errors automatically. The column **Checked** tells which rules it checks.

## Page types

Each page has one type from [Diátaxis](https://diataxis.fr/). Do not mix two types on one page.

| Type         | Folder         | Question of the reader   | Content                                                    |
| ------------ | -------------- | ------------------------ | ---------------------------------------------------------- |
| Tutorial     | `tutorials/`   | "Can you teach me?"      | One lesson with a known result. The reader does each step. |
| How-to guide | `how-to/`      | "How do I do this task?" | Steps for one task. The reader knows the basics.           |
| Reference    | `reference/`   | "What are the facts?"    | Tables and lists of facts. No steps and no opinions.       |
| Explanation  | `explanation/` | "Why is it like this?"   | Reasons, background and alternatives. No steps.            |

A decision record (ADR) goes in `records/adrs/`. It records one decision, its context and its consequences. Copy the [ADR template](../records/adrs/0000-template.md) to start one. A proposal for a large change (RFC) goes in `records/rfcs/`. Copy the [RFC template](../records/rfcs/0000-template.md) to start one.

| Rule                                                                              | Checked |
| --------------------------------------------------------------------------------- | ------- |
| The page is in one of the four folders, in `records/rfcs/` or in `records/adrs/`. | Yes     |
| `docs/README.md` links to the page.                                               | Yes     |
| A tutorial or a how-to guide has numbered steps.                                  | Yes     |
| A reference page or an explanation page has no steps.                             | No      |

## Page templates

### Tutorial

1. Title: what the reader makes. Start with a verb.
2. Introduction: what the reader does and how long it takes.
3. **Before you start**: what the reader needs.
4. One section for each part of the lesson, with numbered steps. After the steps, tell the reader what they see.
5. **What you did**: a short summary.
6. **Next steps**: links to other pages.

### How-to guide

1. Title: the task. Start with a verb.
2. Introduction: when to do the task.
3. **Before you start**: optional.
4. **Procedure**: numbered steps. Use more sections for more procedures.
5. **Result**: the condition after the last step.
6. **Related documents**: links.

### Reference

1. Title: the subject. Use a noun.
2. Introduction: what the page lists and the source file.
3. Tables or lists, in the same sequence as the subject.
4. **Related documents**: links.

### Explanation

1. Title: the subject. Use a noun.
2. Sections that give reasons, background and limits.
3. **Related documents**: links.

## Writing rules

These rules come from ASD-STE100 Simplified Technical English.

| Rule                                                                                       | Checked |
| ------------------------------------------------------------------------------------------ | ------- |
| Write a maximum of 20 words in a sentence of a procedure step.                             | Yes     |
| Write a maximum of 25 words in a descriptive sentence.                                     | Yes     |
| Write a maximum of 6 sentences in a paragraph.                                             | Yes     |
| Do not use contractions. Write "do not", not `don't`.                                      | Yes     |
| Use only the approved words in the table below.                                            | Yes     |
| Write one instruction in each sentence.                                                    | No      |
| Use the imperative in an instruction: "Click **Save Observation**."                        | No      |
| Use the active voice.                                                                      | No      |
| Use the present tense.                                                                     | No      |
| Use one word for one meaning. For example, always use "observation", not "entry" or "log". | No      |
| Use "must" for a requirement. Use "can" for a possibility.                                 | No      |
| Start a warning with **WARNING:** and a caution with **CAUTION:**. Give the risk first.    | No      |
| Write the names of buttons and fields in bold, as the screen shows them.                   | No      |
| Put code, commands, file names and values in code format.                                  | No      |

The docs check counts code in backticks as one word. It ignores code blocks and headings. It reads the text of each table cell. Use code format only for code, values and examples of words. Do not put a prose word in code format to pass the check.

## Words that are not approved

| Do not use               | Use                   |
| ------------------------ | --------------------- |
| `approximately`          | about                 |
| `commence`               | start                 |
| `comprehensive`          | full                  |
| `could`                  | can                   |
| `e.g.`                   | for example           |
| `easily, simply, please` | the instruction only  |
| `ensure, ensures`        | make sure, makes sure |
| `etc.`                   | a full list           |
| `i.e.`                   | that is               |
| `in order to`            | to                    |
| `leverage, utilize`      | use                   |
| `might`                  | can                   |
| `numerous`               | many                  |
| `prior to`               | before                |
| `robust, seamless`       | a specific word       |
| `should`                 | must                  |
| `terminate`              | stop                  |
| `via`                    | through               |
| `whilst`                 | while                 |

The list is in `scripts/docs/checkDocs.ts`. Add a word to the list and to this table at the same time.

## Link rules

| Rule                                                                 | Checked |
| -------------------------------------------------------------------- | ------- |
| A relative link goes to a file that exists.                          | Yes     |
| A link to a heading goes to a heading that exists.                   | Yes     |
| A link text tells the destination. Do not use "here" as a link text. | No      |

## Related documents

- [Write documentation](../how-to/write-documentation.md)
- [Why the docs use STE and Diátaxis](../explanation/documentation-approach.md)
