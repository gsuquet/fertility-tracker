# How-To: Add a New Language (i18n)

This guide describes how to add support for a new locale to **Fertility Tracker**.

---

## Step 1: Add Locale Key to Type Definitions

1. Open [`src/types/crms.ts`](../../src/types/crms.ts).
2. Update the `Language` type definition to include your new ISO 639-1 language code (e.g. `'de'` for German):

   ```typescript
   export type Language = 'en' | 'fr' | 'es' | 'de';
   ```

3. Update [`src/i18n/types.ts`](../../src/i18n/types.ts) to include the new language code in `SupportedLanguage`.

---

## Step 2: Create the Dedicated Translation Module

1. Create a new locale file in `src/i18n/locales/<locale>.ts` (e.g. `src/i18n/locales/de.ts`).
2. Implement the `TranslationSchema` type:

   ```typescript
   import { TranslationSchema } from '../types';

   export const de: TranslationSchema = {
     appTitle: 'Fertility Tracker',
     subtitle: 'Creighton Model System (CrMS)',
     // ... provide translations for all required schema keys
   };
   ```

3. Register the new locale in [`src/i18n/index.ts`](../../src/i18n/index.ts):

   ```typescript
   import { de } from './locales/de';

   export const translations = {
     en,
     fr,
     es,
     de,
   };
   ```

---

## Step 3: Register Locale in Language Switcher UI

1. Open [`src/components/Header.tsx`](../../src/components/Header.tsx).
2. Update the language selector dropdown to include the new language option.

---

## Step 4: Verify Translation Completeness

1. Run the test suite to ensure no TypeScript compilation or missing key errors exist:

   ```bash
   npm run test
   ```

2. Start the dev server and toggle to your new language in the header dropdown to confirm UI rendering:

   ```bash
   npm run dev
   ```
