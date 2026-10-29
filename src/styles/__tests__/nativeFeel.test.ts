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

  it('stops the tap highlight on the whole page', () => {
    expect(ruleBody(reset, /html/)).toMatch(/-webkit-tap-highlight-color:\s*transparent;/);
  });

  it('stops pull to refresh only in the installed application, so a browser tab keeps it', () => {
    const installed =
      /@media \(display-mode: standalone\),\s*\(display-mode: fullscreen\),\s*\(display-mode: minimal-ui\),\s*\(display-mode: window-controls-overlay\)\s*\{\s*html\s*\{\s*overscroll-behavior:\s*none;\s*\}\s*\}/;
    expect(reset).toMatch(installed);
    expect(reset.replace(installed, '')).not.toMatch(/overscroll-behavior/);
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

  it('keeps each scroll area from scrolling the page under it', () => {
    const scrollRules = cssFiles(stylesDir).flatMap(file =>
      [
        ...readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .matchAll(/\{([^{}]*overflow(?:-y)?:\s*(?:auto|scroll);[^{}]*)\}/g),
      ].map(([, body]) => body ?? '')
    );
    expect(scrollRules.length).toBeGreaterThan(5);
    for (const body of scrollRules) {
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

  it('never resets a safe-area padding with a later padding shorthand in the same rule', () => {
    for (const file of cssFiles(stylesDir)) {
      for (const [, body] of readFileSync(file, 'utf8').matchAll(/\{([^{}]*)\}/g)) {
        const longhand = body?.search(/padding-(?:top|left|right|bottom):[^;]*safe-area/) ?? -1;
        if (longhand < 0) continue;
        expect(body?.slice(longhand)).not.toMatch(/(^|[\s;])padding:/);
      }
    }
  });

  it('keeps the toasts at the top clear of the status bar and the notch', () => {
    const today = ruleBody(readCss('views/today.css'), /\.today-toast/);
    expect(today).toMatch(/top:\s*calc\(80px \+ env\(safe-area-inset-top, 0px\)\);/);
    expect(today).toMatch(/right:\s*max\(24px, env\(safe-area-inset-right, 0px\)\);/);
    expect(ruleBody(readCss('primitives/toast.css'), /\.mobile-menu-overlay \.undo-toast/)).toMatch(
      /top:\s*calc\(var\(--space-md\) \+ env\(safe-area-inset-top, 0px\)\);/
    );
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

describe('header in the title bar of an installed app on a computer', () => {
  const header = readCss('views/header.css');
  const overlayStart = header.indexOf('@media (display-mode: window-controls-overlay)');
  const overlay = header.slice(overlayStart);

  it('uses the free area of the title bar only when the overlay is on', () => {
    expect(overlayStart).toBeGreaterThan(-1);
    const rule = ruleBody(overlay, /\.app-header/);
    expect(rule).toMatch(/height:\s*max\(68px,\s*env\(titlebar-area-height, 0px\)\);/);
    expect(rule).toMatch(/padding-left:\s*calc\(env\(titlebar-area-x, 0px\)/);
    expect(rule).toMatch(
      /padding-right:\s*calc\(\s*100vw\s*-\s*env\(titlebar-area-x, 0px\)\s*-\s*env\(titlebar-area-width, 100vw\)/
    );
    // Outside the overlay, nothing uses the title bar values, so a phone and a tab do not change
    expect(header.slice(0, overlayStart)).not.toMatch(/titlebar-area|app-region/);
    // The overlay block is the last one, so it wins over the rules of a narrow window
    expect(overlay.match(/@media \(display-mode/g)).toHaveLength(1);
    expect(overlay).toMatch(
      /@media \(max-width: 640px\)\s*\{\s*\.app-header\s*\{\s*height:\s*max\(54px,\s*env\(titlebar-area-height, 0px\)\);/
    );
  });

  it('moves the window with an empty part of the header, but not with a control', () => {
    expect(ruleBody(overlay, /\.app-header/)).toMatch(
      /-webkit-app-region:\s*drag;\s*app-region:\s*drag;/
    );
    const controls = ruleBody(
      overlay,
      /\.app-header button,\s*\.app-header a,\s*\.app-header input,\s*\.app-header select,\s*\.app-header \[role='tab'\]/
    );
    expect(controls).toMatch(/-webkit-app-region:\s*no-drag;\s*app-region:\s*no-drag;/);
  });

  it('gives the clicks to an open dialog, and keeps the dialogs out of the title bar', () => {
    expect(ruleBody(overlay, /body:has\(dialog\[open\]\) \.app-header/)).toMatch(
      /-webkit-app-region:\s*no-drag;\s*app-region:\s*no-drag;/
    );
    expect(ruleBody(overlay, /\.modal-overlay,\s*\.drawer-overlay/)).toMatch(
      /top:\s*calc\(env\(titlebar-area-y, 0px\) \+ env\(titlebar-area-height, 0px\)\);/
    );
  });
});

describe('the bars and the footer of RFC 0002', () => {
  it('makes the top bar and the bottom bar opaque, with no blur', () => {
    const header = ruleBody(readCss('views/header.css'), /\.app-header/);
    const nav = ruleBody(readCss('views/mobile-nav.css'), /\.mobile-nav-bar/);
    for (const bar of [header, nav]) {
      expect(bar).toMatch(/background-color:\s*var\(--bg-surface\);/);
      expect(bar).not.toMatch(/backdrop-filter/);
    }
  });

  it('has a 32 pixel size for the other controls', () => {
    expect(readCss('tokens/spacing.css')).toMatch(/--control-size-sm:\s*32px;/);
  });

  it('does not print the footer', () => {
    const print = readCss('views/print.css');
    expect(print).toMatch(/\.app-footer,[^{]*\{\s*display:\s*none !important;/);
  });
});
