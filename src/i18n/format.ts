/**
 * Replaces each `{name}` in a translated template with its value.
 * A placeholder without a value stays as it is, so a missing value is visible.
 */
export const formatMessage = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder
  );
