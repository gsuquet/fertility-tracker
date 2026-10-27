/**
 * Replaces each `{name}` in a translated template with its value.
 * A placeholder without a value stays as it is, so a missing value is visible.
 */
export const formatMessage = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder
  );
