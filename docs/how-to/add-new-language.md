# How-To: Add a New Language (i18n)

This guide describes how to add support for a new locale to **Fertility Tracker**.

---

## Step 1: Add Locale Key to Type Definitions

1. Open [`src/types/crms.ts`](../../src/types/crms.ts#L44).
2. Update the `Language` type definition to include your new ISO 639-1 language code (e.g., `'es'` for Spanish, `'de'` for German):

   ```typescript
   export type Language = 'en' | 'fr' | 'es';
   ```

---

## Step 2: Create the Translation Dictionary

1. Open [`src/i18n/translations.ts`](../../src/i18n/translations.ts).
2. Add a new dictionary object under your language code key, translating all existing keys from English:

   ```typescript
   export const translations = {
     en: { ... },
     fr: { ... },
     es: {
       appTitle: 'Cuidad de Fertilidad',
       chartView: 'Gráfico',
       calendarView: 'Calendario',
       analyticsView: 'Análisis',
       // ... translate remaining keys
     }
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
