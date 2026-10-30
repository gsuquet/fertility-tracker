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
// WCAG 2 SC 1.4.11: the edge of a user interface component
const AA_NON_TEXT = 3;

const themes = [
  ['light', lightTokens],
  ['dark', darkTokens],
] as const;

const surfaces = ['--bg-primary', '--bg-surface', '--bg-surface-elevated', '--bg-hero'];
const textTokens = [
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--accent-primary',
  '--color-intercourse-text',
  '--color-peak-text',
  '--color-danger-text',
  '--color-success-text',
  '--color-warning-text',
];
/** The fill gradient of each stamp (badges.css) and its 1 or 2 px border */
const stampEdges: { stamp: string; fills: string[]; border: string }[] = [
  { stamp: 'red', fills: ['--stamp-red-light', '--stamp-red'], border: '--stamp-edge-on-fill' },
  {
    stamp: 'dark green',
    fills: ['--stamp-dark-green-light', '--stamp-dark-green'],
    border: '--stamp-edge-on-fill',
  },
  {
    stamp: 'light green',
    fills: ['--stamp-light-green-light', '--stamp-light-green'],
    border: '--stamp-light-green-border',
  },
  {
    stamp: 'yellow',
    fills: ['--stamp-yellow-light', '--stamp-yellow'],
    border: '--stamp-yellow-border',
  },
  { stamp: 'white', fills: ['--stamp-white'], border: '--stamp-white-border' },
];
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

    it.each([
      '--text-primary',
      '--text-secondary',
      '--color-intercourse-text',
      '--color-peak-text',
      '--color-success-text',
      '--color-danger-text',
    ])('%s on the calendar cycle tint reaches 4.5:1', text => {
      const tint = over(color('--calendar-cycle-tint'), color('--bg-surface'));
      expect(contrast(color(text), tint)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

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

    it.each([
      ['--stamp-white-border', '--stamp-white'],
      ['--stamp-white-border', '--bg-surface'],
      ['--stamp-white-border', '--bg-primary'],
      ['--stamp-light-green-border', '--bg-surface'],
      ['--stamp-empty', '--bg-surface'],
      ['--stamp-empty', '--bg-primary'],
      ['--stamp-empty', '--bg-hero'],
      ['--stamp-white-border', '--bg-hero'],
      ['--stamp-light-green-border', '--bg-hero'],
      ['--stamp-light-green-border', '--bg-primary'],
      ['--phase-before-peak', '--bg-surface'],
    ])('stamp edge %s on %s reaches 3:1', (edge, surface) => {
      expect(contrast(color(edge), color(surface))).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });

    it.each([
      ['--stamp-yellow-text', '--color-warning'],
      ['--stamp-light-green-text', '--stamp-light-green'],
      ['--phase-before-peak-text', '--phase-before-peak'],
      ['--color-white', '--stamp-red'],
      ['--color-white', '--stamp-dark-green'],
    ])('stamp text %s on %s reaches 4.5:1', (text, fill) => {
      expect(contrast(color(text), color(fill))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    // WCAG 1.4.11: the outer line of a stamp is its border, seen over each end of the fill
    // gradient. It reaches 3:1 on each surface, and on the tints behind a stamp: the selected cycle
    // of the calendar and the hover and today cells (--accent-soft).
    const stampBackdrops: [string, () => Rgba][] = [
      ...surfaces.map(surface => [surface, () => color(surface)] as [string, () => Rgba]),
      ['--calendar-cycle-tint', () => over(color('--calendar-cycle-tint'), color('--bg-surface'))],
      ['--accent-soft', () => over(color('--accent-soft'), color('--bg-surface'))],
    ];
    it.each(
      stampEdges.flatMap(({ stamp, fills, border }) =>
        stampBackdrops.map(([name, backdrop]) => [stamp, name, fills, border, backdrop] as const)
      )
    )('the %s stamp has an edge of 3:1 on %s', (_stamp, _name, fills, border, backdrop) => {
      for (const fill of fills) {
        const edge = over(color(border), color(fill));
        expect(contrast(edge, backdrop()), fill).toBeGreaterThanOrEqual(AA_NON_TEXT);
      }
    });

    it('--bg-hero is not lighter than --bg-surface', () => {
      expect(luminance(color('--bg-hero'))).toBeLessThanOrEqual(luminance(color('--bg-surface')));
    });

    it('--color-warning-text on --color-warning-surface reaches 4.5:1', () => {
      const tag = over(color('--color-warning-surface'), color('--bg-surface'));
      expect(contrast(color('--color-warning-text'), tag)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it.each(surfaces)(
      '--color-cycle-start-text on --color-cycle-start-surface over %s reaches 4.5:1',
      surface => {
        const toggle = over(color('--color-cycle-start-surface'), color(surface));
        expect(contrast(color('--color-cycle-start-text'), toggle)).toBeGreaterThanOrEqual(
          AA_NORMAL_TEXT
        );
      }
    );

    it.each(['--bg-surface', '--bg-surface-elevated'])(
      '--color-success-text on --color-success-surface over %s reaches 4.5:1',
      surface => {
        const badge = over(color('--color-success-surface'), color(surface));
        expect(contrast(color('--color-success-text'), badge)).toBeGreaterThanOrEqual(
          AA_NORMAL_TEXT
        );
      }
    );

    // The Saved and Not saved badges of Today: on the date bar of a phone (--bg-surface), on the
    // page from 641 px (--bg-primary) and on the status card of the desktop (--bg-hero)
    it.each(
      ['success', 'warning'].flatMap(state => surfaces.map(surface => [state, surface] as const))
    )('the %s badge text reaches 4.5:1 on its surface over %s', (state, surface) => {
      const badge = over(color(`--color-${state}-surface`), color(surface));
      expect(contrast(color(`--color-${state}-text`), badge)).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT
      );
    });

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

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path);
    return [path];
  });

describe('contrast-safe token usage', () => {
  it('colors the active cycle start toggle with the cycle start tokens', () => {
    const forms = readCss('primitives/forms.css');
    const rule = /\.cycle-start-toggle-btn\.active\s*\{([^}]*)\}/.exec(forms);
    expect(rule?.[1]).toMatch(/(^|\s)color:\s*var\(--color-cycle-start-text\)/);
    expect(rule?.[1]).toMatch(/background-color:\s*var\(--color-cycle-start-surface\)/);
  });

  it.each(cssFiles(stylesDir).map(path => [path.slice(stylesDir.length + 1), path]))(
    '%s fills backgrounds with --accent-solid, not --accent-primary',
    (_name, path) => {
      const css = readFileSync(path, 'utf8');
      expect(css).not.toMatch(/background(-color)?:\s*var\(--accent-primary(-hover)?[,)]/);
    }
  );

  it('defines in src/styles/tokens/ each custom property that a style or a component uses', () => {
    const files = [
      ...cssFiles(stylesDir),
      ...sourceFiles(join(stylesDir, '..')).filter(path => path.endsWith('.tsx')),
    ].map(path => readFileSync(path, 'utf8'));
    const tokenFiles = cssFiles(join(stylesDir, 'tokens')).map(path => readFileSync(path, 'utf8'));
    const defined = new Set(
      tokenFiles.flatMap(css => [...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))
    );
    const used = new Set(
      files.flatMap(css => [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]))
    );
    expect([...used].filter(name => !defined.has(name))).toEqual([]);
  });

  it.each([['views/today.css', '.today-toast', '--color-success-solid']])(
    '%s fills %s with %s',
    (file, selector, token) => {
      const css = readCss(file);
      const escaped = selector.replace(/[.]/g, '\\.');
      const rule = new RegExp(`(?:^|\\s)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
      expect(rule?.[1]).toMatch(new RegExp(`background-color:\\s*var\\(${token}\\)`));
    }
  );

  it.each([
    ['.stamp-white_baby', '--stamp-white-border'],
    ['.stamp-light_green_baby_3', '--stamp-light-green-border'],
    ['.legend-badge.stamp-white_baby', '--stamp-white-border', 'views/chart.css'],
  ])('draws the edge of %s with %s', (selector, token, file = 'primitives/badges.css') => {
    const badges = readCss(file);
    const escaped = selector.replace(/[.]/g, '\\.');
    const rule = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(badges);
    expect(rule?.[1]).toMatch(new RegExp(`border:\\s*[\\d.]+px solid var\\(${token}\\)`));
  });

  it('draws the edge of the empty stamp with a dashed --stamp-empty line', () => {
    const rule = /\.stamp-empty\s*\{([^}]*)\}/.exec(readCss('primitives/badges.css'));
    expect(rule?.[1]).toMatch(/border:\s*[\d.]+px dashed var\(--stamp-empty\)/);
  });

  it('gives the dry and fertile trend bars the dry stamp green and the accent', () => {
    const analytics = readCss('views/analytics.css');
    expect(/\.bar-dry\s*\{([^}]*)\}/.exec(analytics)?.[1]).toMatch(
      /background-color:\s*var\(--stamp-dark-green\);/
    );
    expect(/\.bar-fertile\s*\{([^}]*)\}/.exec(analytics)?.[1]).toMatch(
      /background-color:\s*var\(--accent-solid\);/
    );
  });

  it('colors the intercourse key of the chart legend like the I mark of a stamp', () => {
    const chart = readCss('views/chart.css');
    expect(/\.legend-badge\.intercourse-legend\s*\{([^}]*)\}/.exec(chart)?.[1]).toMatch(
      /background-color:\s*var\(--brand-ink\);/
    );
  });

  it.each([
    ['.legend-badge.peak-legend', 'color', '--stamp-yellow-text'],
    ['.intercourse-text', 'color', '--color-intercourse-text'],
  ])('colors %s with %s %s', (selector, property, token) => {
    const chart = readCss('views/chart.css');
    const escaped = selector.replace(/[.]/g, '\\.');
    const rule = new RegExp(`(?:^|\\s)${escaped}\\s*\\{([^}]*)\\}`).exec(chart);
    expect(rule?.[1]).toMatch(new RegExp(`(^|\\s)${property}:\\s*var\\(${token}\\);`));
  });

  it('colors the purple icon of the welcome guide with --color-peak-text', () => {
    const rule = /\.text-purple\s*\{([^}]*)\}/.exec(readCss('views/modals.css'));
    expect(rule?.[1]).toMatch(/color:\s*var\(--color-peak-text\);/);
  });

  it('keeps the print font on printed headings', () => {
    expect(readCss('views/print.css')).toMatch(
      /h1,\s*h2,\s*h3\s*\{\s*font-family:\s*inherit !important;/
    );
  });

  it('sizes the baby of the legends with CSS', () => {
    expect(readCss('views/chart.css')).toMatch(
      /\.legend-badge \.baby-svg\s*\{\s*width:\s*12px;\s*height:\s*12px;/
    );
    expect(readCss('views/print.css')).toMatch(
      /\.print-badge-sample \.baby-svg\s*\{\s*width:\s*10px;\s*height:\s*10px;/
    );
  });

  it.each(['success', 'warning'])('colors .badge-%s with its color tokens', state => {
    const rule = new RegExp(`\\.badge-${state}\\s*\\{([^}]*)\\}`).exec(
      readCss('primitives/badges.css')
    );
    expect(rule?.[1]).toMatch(new RegExp(`(^|\\s)color:\\s*var\\(--color-${state}-text\\)`));
    expect(rule?.[1]).toMatch(new RegExp(`background-color:\\s*var\\(--color-${state}-surface\\)`));
    expect(rule?.[1]).toMatch(new RegExp(`border-color:\\s*var\\(--color-${state}-border\\)`));
  });

  it('colors the Saved button of Today with the success tokens, over an opaque surface', () => {
    const rule = /\.submit-save-btn\.is-saved\s*\{([^}]*)\}/.exec(readCss('views/today.css'));
    expect(rule?.[1]).toMatch(/(^|\s)color:\s*var\(--color-success-text\)/);
    // The bar is sticky on a phone: the page scrolls under it
    expect(rule?.[1]).toMatch(/background-color:\s*var\(--bg-surface\)/);
    expect(rule?.[1]).toMatch(
      /background-image:\s*linear-gradient\(var\(--color-success-surface\), var\(--color-success-surface\)\)/
    );
    expect(rule?.[1]).toMatch(/border-color:\s*var\(--color-success-border\)/);
    expect(rule?.[1]).toMatch(/opacity:\s*1/);
  });

  it('colors the welcome form mode badge with the info tokens', () => {
    const modals = readCss('views/modals.css');
    const rule = /\.form-mode-badge\s*\{([^}]*)\}/.exec(modals);
    expect(rule?.[1]).toMatch(/(^|\s)color:\s*var\(--color-info-text\)/);
    expect(rule?.[1]).toMatch(/background-color:\s*var\(--color-info-surface\)/);
  });

  it('keeps the text of an empty chart day opaque', () => {
    const chart = readCss('views/chart.css');
    const rules = [...chart.matchAll(/\.empty-cell\.paper-cell(:hover)?\s*\{([^}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(rule[2]).not.toMatch(/opacity/);
  });

  it('keeps the footer text opaque, also in a media query', () => {
    const footer = readCss('views/footer.css');
    const rules = [...footer.matchAll(/\.app-footer\s*\{([^}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(1);
    for (const rule of rules) expect(rule[1]).not.toMatch(/opacity/);
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
