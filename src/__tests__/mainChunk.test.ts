import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..');

// A static import or export of a relative module. `import type` and `import()` are not in the chunk.
const STATIC_IMPORT =
  /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"](\.[^'"]+)['"]/gm;

const resolveModule = (fromFile: string, specifier: string): string | null => {
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (/\.tsx?$/.test(candidate) && existsSync(candidate)) return candidate;
  }
  return null;
};

/** The source files that the main chunk holds: the static imports of `main.tsx`, recursively. */
const mainChunkModules = (): Set<string> => {
  const seen = new Set<string>();
  const queue = [join(SRC, 'main.tsx')];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, 'utf-8').matchAll(STATIC_IMPORT)) {
      const target = resolveModule(file, match[1] as string);
      if (target) queue.push(target);
    }
  }
  return new Set([...seen].map(file => relative(SRC, file).replaceAll('\\', '/')));
};

describe('main chunk', () => {
  const modules = mainChunkModules();

  it('holds the app shell', () => {
    expect(modules).toContain('App.tsx');
    expect(modules).toContain('domain/appVersion.ts');
    expect(modules).toContain('components/Header.tsx');
  });

  it.each([
    'domain/versionTracker.ts',
    'components/CycleAnalyticsView.tsx',
    'components/ExportModal.tsx',
    'components/PrintExportView.tsx',
    'components/VersionModal.tsx',
    'components/WelcomeModal.tsx',
  ])('does not hold %s, which loads lazily', file => {
    expect(modules).not.toContain(file);
  });
});
