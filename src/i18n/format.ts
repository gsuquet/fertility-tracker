/**
 * Replaces each `{name}` in a translated template with its value.
 * A placeholder without a value stays as it is, so a missing value is visible.
 */
export const formatMessage = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder
  );

/** A number of days with at most one decimal, in the format of the locale: "28.5" or "28,5" */
export const formatDays = (days: number, locale: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(days);

/** True when the locale uses the singular for this number: 1 in English, 0 to 1.9 in French */
export const isSingular = (value: number, locale: string): boolean =>
  new Intl.PluralRules(locale).select(value) === 'one';
