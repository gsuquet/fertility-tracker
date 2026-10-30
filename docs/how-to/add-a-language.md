# Add a language

Use this procedure to translate the application into a new language. The example adds German (`de`).

The application has English (`en`) and French (`fr`). English is the reference. Each language must have all the keys of the English file.

## Procedure

1. Add the language code to the `Language` type in `src/types/crms.ts`:

   ```ts
   export type Language = 'en' | 'fr' | 'de';
   ```

2. Add the same code to `SupportedLanguage` in `src/i18n/types.ts`.
3. Copy `src/i18n/locales/en.ts` to `src/i18n/locales/de.ts`.
4. In `de.ts`, change the name of the constant to `de`. Set its type to `TranslationSchema`:

   ```ts
   import type { TranslationSchema } from '../types';

   export const de: TranslationSchema = {
     // ...
   };
   ```

5. Translate each text in `de.ts`. Set `locale` to `'de-DE'`. Keep each `{name}` placeholder. Do not translate the CrMS codes, for example `10KLX3`.
6. In `src/i18n/index.ts`, import `de`. Add it to `translations` and to `supportedLanguages`.
7. In `src/context/LanguageContext.tsx`, accept `'de'` as a saved language.
8. Add tests for the new language. Use `renderWithProviders(ui, { language: 'de' })`.
9. Run all the quality gates:

   ```bash
   mise run validate
   ```

## Result

**Language** in Settings shows the new language. The type check fails if the new file does not have all the keys.

## Related documents

- [Write a test first](write-a-test-first.md)
- [Project structure](../reference/project-structure.md)
