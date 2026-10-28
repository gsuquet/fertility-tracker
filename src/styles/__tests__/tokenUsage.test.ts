import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = join(__dirname, '..');

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : cssFiles(path);
    return path.endsWith('.css') ? [path] : [];
  });

// Paper has its own absolute colors and pt sizes, and the tokens are the only other place for literals
const screenFiles = cssFiles(stylesDir)
  .map(path => path.slice(stylesDir.length + 1))
  .filter(name => !name.startsWith('tokens/') && name !== 'views/print.css');

// The value part of each declaration, without comments
const declarationValues = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/:([^;{}]*)[;}]/g)].map(
    match => match[1] ?? ''
  );

const COLOR_LITERAL =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|(?<![\w-])(?:white|black|red|green|blue|gray|grey|yellow|orange|pink|purple)(?![\w-])/i;

const declarations = (file: string, property: string) =>
  [
    ...readFileSync(join(stylesDir, file), 'utf8').matchAll(
      new RegExp(`(?:^|[\\s;{])${property}:\\s*([^;]+);`, 'g')
    ),
  ].map(match => match[1]?.trim() ?? '');

const TYPE_SCALE = [
  '--font-size-4xs',
  '--font-size-3xs',
  '--font-size-2xs',
  '--font-size-xs',
  '--font-size-sm',
  '--font-size-md',
  '--font-size-base',
  '--font-size-lg',
  '--font-size-xl',
  '--font-size-2xl',
];

describe('design token usage in the screen styles', () => {
  it.each(screenFiles)('%s writes no color literal', file => {
    const css = readFileSync(join(stylesDir, file), 'utf8');
    expect(declarationValues(css).filter(value => COLOR_LITERAL.test(value))).toEqual([]);
  });

  it.each(screenFiles)('%s has no theme rule, because the tokens carry both themes', file => {
    expect(readFileSync(join(stylesDir, file), 'utf8')).not.toMatch(/\[data-theme/);
  });

  it.each(screenFiles)('%s takes each font size from the type scale', file => {
    const sizes = declarations(file, 'font-size')
      .map(value => value.replace(/\s*!important$/, ''))
      .filter(value => value !== '100%');
    for (const size of sizes) {
      expect(TYPE_SCALE.map(token => `var(${token})`)).toContain(size);
    }
  });

  it.each(screenFiles)('%s takes each corner radius from the radius tokens', file => {
    for (const radius of declarations(file, 'border-radius')) {
      const parts = radius.replace(/\s*!important$/, '').split(/\s+/);
      for (const part of parts) expect(part).toMatch(/^(var\(--radius-[\w-]+\)|0|50%)$/);
    }
  });

  it('declares the type scale from 9 to 28 pixels in rem', () => {
    const tokens = readFileSync(join(stylesDir, 'tokens', 'spacing.css'), 'utf8');
    const values = TYPE_SCALE.map(
      token => new RegExp(`${token}:\\s*([\\d.]+)rem;`).exec(tokens)?.[1]
    );
    expect(values.map(value => Number(value) * 16)).toEqual([
      9, 10, 11, 12, 13, 14, 16, 18, 22, 28,
    ]);
  });
});
