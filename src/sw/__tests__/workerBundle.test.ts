import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = join(__dirname, '..', '..');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });

describe('worker bundle', () => {
  it('keeps the worker code out of the page code, so sw.js has no import of a shared chunk', () => {
    const pageFiles = sourceFiles(srcDir).filter(file => !relative(srcDir, file).startsWith('sw/'));
    expect(pageFiles.length).toBeGreaterThan(10);
    for (const file of pageFiles) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/from ['"][./]*\/?sw\//);
    }
  });
});
