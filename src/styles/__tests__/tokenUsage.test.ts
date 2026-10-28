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

const declarations = (file: string, property: string) =>
  [
    ...readFileSync(join(stylesDir, file), 'utf8').matchAll(
      new RegExp(`(?:^|[\\s;{])${property}:\\s*([^;]+);`, 'g')
    ),
  ].map(match => match[1]?.trim() ?? '');

const TYPE_SCALE = [
  '--text-4xs',
  '--text-3xs',
  '--text-2xs',
  '--text-xs',
  '--text-sm',
  '--text-md',
  '--text-base',
  '--text-lg',
  '--text-xl',
  '--text-2xl',
];

describe('design token usage in the screen styles', () => {
  it.each(screenFiles)('%s writes no color literal', file => {
    const css = readFileSync(join(stylesDir, file), 'utf8');
    const literals = css.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|:\s*(white|black)\b/gi) ?? [];
    expect(literals).toEqual([]);
  });

  it.each(screenFiles)('%s takes each font size from the type scale', file => {
    const sizes = declarations(file, 'font-size').filter(value => value !== '100%');
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
