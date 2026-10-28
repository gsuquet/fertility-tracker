import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = join(__dirname, '..');
const rootDir = join(stylesDir, '..', '..');
const readCss = (file: string) => readFileSync(join(stylesDir, file), 'utf8');

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : cssFiles(path);
    return path.endsWith('.css') ? [path] : [];
  });

describe('system font', () => {
  it('sets all text in the font of the operating system', () => {
    expect(readCss('tokens/tokens.css')).toMatch(
      /--font-family:\s*system-ui,\s*-apple-system,\s*BlinkMacSystemFont,\s*'Segoe UI',\s*Roboto,\s*'Helvetica Neue',\s*Arial,\s*sans-serif;/
    );
  });

  it('gives the headings and the wordmark the same font as the text', () => {
    expect(readCss('tokens/tokens.css')).toMatch(/--font-display:\s*var\(--font-family\);/);
    expect(readCss('base/reset.css')).toMatch(
      /h1,\s*h2,\s*h3\s*\{[^}]*font-family:\s*var\(--font-display\)/
    );
    expect(readCss('views/header.css')).toMatch(
      /\.brand-title\s*\{[^}]*font-family:\s*var\(--font-display\)/
    );
  });

  it('declares no font file, so the build has none and loads nothing from a remote host', () => {
    for (const file of cssFiles(stylesDir)) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/@font-face|\.woff2?\b/);
    }
    expect(readCss('index.css')).not.toContain('fonts.css');
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(names.filter(name => name.startsWith('@fontsource'))).toEqual([]);
  });
});
