import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = join(__dirname, '..');
const readCss = (file: string) => readFileSync(join(stylesDir, file), 'utf8');

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : cssFiles(path);
    return path.endsWith('.css') ? [path] : [];
  });

/** The declarations of every rule whose selector list matches `selector`, also in media queries. */
const ruleBody = (css: string, selector: RegExp) =>
  [...css.matchAll(new RegExp(`(?:^|[\\s}])${selector.source}\\s*\\{([^}]*)\\}`, 'g'))]
    .map(match => match[1])
    .join('\n');

describe('touch behavior of an installed application', () => {
  const reset = readCss('base/reset.css');

  it('stops pull to refresh and the tap highlight on the whole page', () => {
    const html = ruleBody(reset, /html/);
    expect(html).toMatch(/overscroll-behavior:\s*none;/);
    expect(html).toMatch(/-webkit-tap-highlight-color:\s*transparent;/);
  });

  it('stops the double-tap zoom on controls, but keeps pinch zoom', () => {
    const controls = ruleBody(reset, /button,\s*a,\s*input,\s*select,\s*textarea,\s*label/);
    expect(controls).toMatch(/touch-action:\s*manipulation;/);
    expect(readFileSync(join(stylesDir, '..', '..', 'index.html'), 'utf8')).toContain(
      'maximum-scale=5.0'
    );
  });

  it('stops text selection and the callout on a long press of a button or a tab', () => {
    const chrome = ruleBody(reset, /button,\s*\[role='button'\],\s*\[role='tab'\]/);
    expect(chrome).toMatch(/-webkit-user-select:\s*none;/);
    expect(chrome).toMatch(/(^|\s)user-select:\s*none;/);
    expect(chrome).toMatch(/-webkit-touch-callout:\s*none;/);
    for (const [file, selector] of [
      ['views/header.css', /\.app-header/],
      ['views/mobile-nav.css', /\.mobile-nav-bar/],
    ] as const) {
      expect(ruleBody(readCss(file), selector)).toMatch(/-webkit-touch-callout:\s*none;/);
    }
  });

  it.each([
    ['primitives/dialogs.css'],
    ['views/drawer.css'],
    ['views/cycle-picker.css'],
    ['views/modals.css'],
  ])('keeps each scroll area of %s from scrolling the page under it', file => {
    const css = readCss(file).replace(/\/\*[\s\S]*?\*\//g, '');
    const scrollRules = [...css.matchAll(/\{([^{}]*overflow-y:\s*auto;[^{}]*)\}/g)];
    expect(scrollRules.length).toBeGreaterThan(0);
    for (const [, body] of scrollRules) {
      expect(body).toMatch(/overscroll-behavior:\s*contain;/);
    }
  });
});

describe('safe areas and the space of the page buttons', () => {
  it('defines the height of the page buttons one time, in the tokens', () => {
    const spacing = readCss('tokens/spacing.css');
    expect(spacing).toMatch(/--mobile-nav-height:\s*62px;/);
    expect(spacing).toMatch(
      /--mobile-nav-space:\s*calc\(var\(--mobile-nav-height\) \+ env\(safe-area-inset-bottom, 0px\)\);/
    );
    for (const file of cssFiles(stylesDir)) {
      if (file.endsWith('spacing.css') || file.endsWith('print.css')) continue;
      expect(readFileSync(file, 'utf8')).not.toMatch(/\b(62|70|72|74)px\b/);
    }
  });

  it('keeps the last row of each page above the page buttons', () => {
    expect(readCss('base/reset.css')).toMatch(
      /padding-bottom:\s*calc\(var\(--mobile-nav-space\) \+ var\(--space-sm\)\);/
    );
    expect(readCss('views/mobile-nav.css')).toMatch(/height:\s*var\(--mobile-nav-space\);/);
    expect(readCss('primitives/toast.css')).toMatch(
      /bottom:\s*calc\(var\(--mobile-nav-space\) \+ var\(--space-sm\)\);/
    );
  });

  it('keeps the header under the status bar and away from the notch', () => {
    const header = ruleBody(readCss('views/header.css'), /\.app-header/);
    expect(header).toMatch(/height:\s*calc\(68px \+ env\(safe-area-inset-top, 0px\)\);/);
    expect(header).toMatch(/padding-top:\s*env\(safe-area-inset-top, 0px\);/);
    expect(header).toMatch(/padding-left:\s*max\(1\.25rem, env\(safe-area-inset-left, 0px\)\);/);
    expect(header).toMatch(/padding-right:\s*max\(1\.25rem, env\(safe-area-inset-right, 0px\)\);/);
  });

  it('keeps the safe areas in the shorter phone header', () => {
    const phone =
      /@media \(max-width: 640px\) \{([\s\S]*)/.exec(readCss('views/header.css'))?.[1] ?? '';
    const header = ruleBody(phone, /\.app-header/);
    expect(header).toMatch(/height:\s*calc\(54px \+ env\(safe-area-inset-top, 0px\)\);/);
    expect(header).toMatch(/padding-top:\s*env\(safe-area-inset-top, 0px\);/);
    expect(header).toMatch(/padding-left:\s*max\(0\.5rem, env\(safe-area-inset-left, 0px\)\);/);
    expect(header).toMatch(/padding-right:\s*max\(0\.5rem, env\(safe-area-inset-right, 0px\)\);/);
  });

  it('keeps the page content and the page buttons away from the notch in landscape', () => {
    const layout = readCss('base/layout.css');
    expect(layout).toMatch(/padding-left:\s*max\(1\.5rem, env\(safe-area-inset-left, 0px\)\);/);
    expect(layout).toMatch(/padding-right:\s*max\(1\.5rem, env\(safe-area-inset-right, 0px\)\);/);
    const nav = readCss('views/mobile-nav.css');
    expect(nav).toMatch(/padding-left:\s*max\(0\.25rem, env\(safe-area-inset-left, 0px\)\);/);
    expect(nav).toMatch(/padding-right:\s*max\(0\.25rem, env\(safe-area-inset-right, 0px\)\);/);
  });
});

describe('footer of the installed application', () => {
  it('hides the footer in each installed display mode', () => {
    const footer = readCss('views/footer.css');
    const query =
      /@media \(display-mode: standalone\),\s*\(display-mode: fullscreen\),\s*\(display-mode: minimal-ui\),\s*\(display-mode: window-controls-overlay\)\s*\{\s*\.app-footer\s*\{\s*display:\s*none;\s*\}\s*\}/;
    expect(footer).toMatch(query);
  });
});
