# Languages

This page gives the rules for the languages and the text of the user interface. To add a language, read [Add a language](../how-to/add-a-language.md).

**Source files:** [src/context/LanguageContext.tsx](../../src/context/LanguageContext.tsx), `src/i18n/`

| File                     | Content                                                  |
| ------------------------ | -------------------------------------------------------- |
| `src/i18n/types.ts`      | The types `TranslationSchema` and `SupportedLanguage`    |
| `src/i18n/locales/en.ts` | The English text                                         |
| `src/i18n/locales/fr.ts` | The French text, with the type of the translation schema |
| `src/i18n/index.ts`      | The objects `translations` and `supportedLanguages`      |
| `src/i18n/format.ts`     | The function `formatMessage(template, values)`           |
- The languages are English (`en`) and French (`fr`). The type check fails if a language file does not have all the keys.
- Components get each text and the date locale (`t.locale`: `en-US` or `fr-FR`) from the dictionary. They do not test `language === 'fr'` and they have no fallback texts.
- `LanguageProvider` sets `document.documentElement.lang` to the language at each change. Thus, screen readers use the correct voice.
- `formatMessage` replaces each `{name}` with its value. It keeps a placeholder without a value, and it reads only the own properties of `values` (`Object.hasOwn`).
- A template has the full sentence, for example `Day {day}: {phase}`. Thus, each language can put the values in its own word sequence.
- Each release in `VERSION_HISTORY` has English and French text: `title` and `titleFr`, `tagline` and `taglineFr`, `highlights` and `highlightsFr`.

All the text that the user sees comes from the dictionary. This includes:

- JSX text and the `aria-label`, `aria-description`, `title`, `placeholder` and `alt` attributes.
- The chart cell labels, the details, the legends, the calendar month and day names, the cycle picker and the footer.
- The empty analytics page, the printed report, the chart subtitle (`chartStrip.subtitle`, `chartStrip.subtitleBlank`) and the cycle start state (`cycleStartModal.isCycleStartYes`, `isCycleStartNo`).
- The average values of the statistics bar (`stats.averageDays`, `{value} days (avg)`).

Some texts are the same in each language: the CrMS codes (`10KLX3 I AP`, `P`, `I`), the stamp names in cell labels and the prefix `v`. The cycle day abbreviation is `CD` in English and `JC` (_jour du cycle_) in French.

`src/i18n/__tests__/noHardcodedText.test.ts` reads each `.tsx` file of `src/`, but not the tests, with the parser of Vite. It fails when one of these items has a letter:

- A JSX text, or a string or template literal in a JSX expression.
- A string in an `aria-label`, `aria-description`, `title`, `placeholder` or `alt` attribute.
- A string property of an application component, that is a tag that starts with a capital letter.

The test ignores these properties: `className`, `id`, `key`, `stamp`, `size`, `variant`, `fill`, `aria-hidden`, `labelledBy`, `describedBy` and `panelClassName`. It reads through parentheses, TypeScript casts, arrays, conditions, `&&`, `||` and `+`. The test accepts the texts `P`, `I`, `v` and `10KLX3 I AP`.

## Related documents

- [Add a language](../how-to/add-a-language.md)
- [Test rules and helpers](test-rules.md)
