import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = join(__dirname, '..');
const readCss = (file: string) => readFileSync(join(stylesDir, file), 'utf8');

const tokensCss = readCss('tokens/tokens.css');

// Returns the custom properties declared in the first block that opens with `opener`
const customPropertiesOf = (css: string, opener: string): Record<string, string> => {
  const start = css.indexOf(opener);
  expect(start).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const entries = [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
    match => [match[1], match[2]?.trim()] as const
  );
  return Object.fromEntries(entries);
};

const lightTokens = customPropertiesOf(tokensCss, ':root {');
const darkTokens = { ...lightTokens, ...customPropertiesOf(tokensCss, "[data-theme='dark'] {") };

type Rgba = [number, number, number, number];

const parseColor = (value: string): Rgba => {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(value);
  expect(rgba, `unsupported color ${value}`).not.toBeNull();
  const [, r, g, b, a] = rgba as RegExpExecArray;
  return [Number(r), Number(g), Number(b), Number(a)];
};

// Paints a translucent color over an opaque backdrop
const over = (top: Rgba, backdrop: Rgba): Rgba => {
  const alpha = top[3];
  return [0, 1, 2].map(i => top[i]! * alpha + backdrop[i]! * (1 - alpha)).concat(1) as Rgba;
};

const luminance = ([r, g, b]: Rgba) => {
  const [lr, lg, lb] = [r, g, b].map(channel => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr! + 0.7152 * lg! + 0.0722 * lb!;
};

const contrast = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const AA_NORMAL_TEXT = 4.5;

const themes = [
  ['light', lightTokens],
  ['dark', darkTokens],
] as const;

const surfaces = ['--bg-primary', '--bg-surface', '--bg-surface-elevated'];
const textTokens = ['--text-primary', '--text-secondary', '--text-muted', '--accent-primary'];
const whiteTextFills = [
  '--accent-solid',
  '--accent-solid-hover',
  '--color-danger',
  '--color-danger-hover',
  '--color-success-solid',
  '--color-intercourse',
  '--color-peak',
];

describe('design token contrast (WCAG 2 AA)', () => {
  describe.each(themes)('%s theme', (_theme, tokens) => {
    const color = (name: string) => {
      const value = tokens[name];
      expect(value, `${name} is not defined`).toBeDefined();
      return parseColor(value as string);
    };

    it.each(textTokens.flatMap(text => surfaces.map(surface => [text, surface] as const)))(
      '%s on %s reaches 4.5:1',
      (text, surface) => {
        expect(contrast(color(text), color(surface))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    );

    it.each(['--bg-primary', '--bg-surface'])(
      '--accent-primary on --accent-light over %s reaches 4.5:1',
      surface => {
        const tint = over(color('--accent-light'), color(surface));
        expect(contrast(color('--accent-primary'), tint)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    );

    it.each(whiteTextFills)('white text on %s reaches 4.5:1', fill => {
      expect(contrast(color('--color-white'), color(fill))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it('--color-warning-text on --color-warning-surface reaches 4.5:1', () => {
      const tag = over(color('--color-warning-surface'), color('--bg-surface'));
      expect(contrast(color('--color-warning-text'), tag)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it.each(['--bg-surface', '--bg-surface-elevated'])(
      '--color-success-text on --color-success-surface over %s reaches 4.5:1',
      surface => {
        const badge = over(color('--color-success-surface'), color(surface));
        expect(contrast(color('--color-success-text'), badge)).toBeGreaterThanOrEqual(
          AA_NORMAL_TEXT
        );
      }
    );

    it.each(['--bg-surface', '--bg-surface-elevated'])(
      '--color-info-text on --color-info-surface over %s reaches 4.5:1',
      surface => {
        const badge = over(color('--color-info-surface'), color(surface));
        expect(contrast(color('--color-info-text'), badge)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    );
  });
});

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : cssFiles(path);
    return path.endsWith('.css') ? [path] : [];
  });

describe('contrast-safe token usage', () => {
  it.each(cssFiles(stylesDir).map(path => [path.slice(stylesDir.length + 1), path]))(
    '%s fills backgrounds with --accent-solid, not --accent-primary',
    (_name, path) => {
      const css = readFileSync(path, 'utf8');
      expect(css).not.toMatch(/background(-color)?:\s*var\(--accent-primary(-hover)?[,)]/);
    }
  );

  it('defines in src/styles/tokens/ each custom property that a style uses', () => {
    const files = cssFiles(stylesDir).map(path => readFileSync(path, 'utf8'));
    const tokenFiles = cssFiles(join(stylesDir, 'tokens')).map(path => readFileSync(path, 'utf8'));
    const defined = new Set(
      tokenFiles.flatMap(css => [...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))
    );
    const used = new Set(
      files.flatMap(css => [...css.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]))
    );
    expect([...used].filter(name => !defined.has(name))).toEqual([]);
  });

  it.each([
    ['primitives/forms.css', '.intercourse-toggle-btn.active', '--color-intercourse'],
    ['primitives/forms.css', '.peak-toggle-btn.active', '--color-peak'],
    ['views/today.css', '.today-toast', '--color-success-solid'],
  ])('%s fills %s with %s', (file, selector, token) => {
    const css = readCss(file);
    const escaped = selector.replace(/[.]/g, '\\.');
    const rule = new RegExp(`(?:^|\\s)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
    expect(rule?.[1]).toMatch(new RegExp(`background-color:\\s*var\\(${token}\\)`));
  });

  it('colors the welcome form mode badge with the info tokens', () => {
    const modals = readCss('views/modals.css');
    const rule = /\.form-mode-badge\s*\{([^}]*)\}/.exec(modals);
    expect(rule?.[1]).toMatch(/(^|\s)color:\s*var\(--color-info-text\)/);
    expect(rule?.[1]).toMatch(/background-color:\s*var\(--color-info-surface\)/);
  });

  it('colors the mobile menu version badge with the success tokens', () => {
    const header = readCss('views/header.css');
    // The selector must beat `.sheet-action-content span`, which sets the muted text color
    const rule = /\.sheet-action-content \.sheet-version-badge\s*\{([^}]*)\}/.exec(header);
    expect(rule?.[1]).toMatch(/(^|\s)color:\s*var\(--color-success-text\)/);
    expect(rule?.[1]).toMatch(/background-color:\s*var\(--color-success-surface\)/);
  });

  it('keeps the text of an empty chart day opaque', () => {
    const chart = readCss('views/chart.css');
    const rules = [...chart.matchAll(/\.empty-cell\.paper-cell(:hover)?\s*\{([^}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(rule[2]).not.toMatch(/opacity/);
  });

  it('keeps the footer copyright text opaque', () => {
    const footer = readCss('views/footer.css');
    const rule = /\.footer-copyright-text\s*\{([^}]*)\}/.exec(footer);
    expect(rule?.[1]).not.toMatch(/opacity/);
  });

  it('colors the chart symptom tag with the warning tokens', () => {
    const chart = readCss('views/chart.css');
    const rules = [...chart.matchAll(/\.cell-symptom-tag\s*\{([^}]*)\}/g)].map(m => m[1]);
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule).toMatch(/(^|\s)color:\s*var\(--color-warning-text\)/);
      expect(rule).toMatch(/background-color:\s*var\(--color-warning-surface\)/);
    }
  });
});
