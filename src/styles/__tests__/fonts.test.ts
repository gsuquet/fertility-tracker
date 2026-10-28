import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = join(__dirname, '..');
const readCss = (file: string) => readFileSync(join(stylesDir, file), 'utf8');

const PACKAGE = '@fontsource-variable/plus-jakarta-sans';
const fontFaces = () => readCss('base/fonts.css').match(/@font-face\s*\{[^}]*\}/g) ?? [];

describe('self-hosted Plus Jakarta Sans font', () => {
  it('declares the latin and latin-ext variable woff2 files of the npm package', () => {
    const urls = fontFaces().map(face => face.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1]);
    expect(urls).toEqual([
      `${PACKAGE}/files/plus-jakarta-sans-latin-ext-wght-normal.woff2`,
      `${PACKAGE}/files/plus-jakarta-sans-latin-wght-normal.woff2`,
    ]);
  });

  it('uses the family name of the design tokens, the weight range and font-display swap', () => {
    for (const face of fontFaces()) {
      expect(face).toContain("font-family: 'Plus Jakarta Sans';");
      expect(face).toContain('font-weight: 200 800;');
      expect(face).toContain('font-display: swap;');
      expect(face).toMatch(/unicode-range:\s+U\+/);
    }
    expect(readCss('tokens/tokens.css')).toMatch(
      /--font-display:\s*'Plus Jakarta Sans', system-ui/
    );
  });

  it('sets running text in the system font and headings in the display font', () => {
    expect(readCss('tokens/tokens.css')).toMatch(/--font-family:\s*system-ui,/);
    expect(readCss('base/reset.css')).toMatch(
      /h1,\s*h2,\s*h3\s*\{[^}]*font-family:\s*var\(--font-display\)/
    );
    expect(readCss('views/header.css')).toMatch(
      /\.brand-title\s*\{[^}]*font-family:\s*var\(--font-display\)/
    );
  });

  it('is imported by the master stylesheet and loads nothing from a remote host', () => {
    expect(readCss('index.css')).toContain("@import './base/fonts.css';");
    expect(readCss('base/fonts.css')).not.toMatch(/https?:\/\//);
  });
});
