import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(__dirname, '..', '..', path), 'utf8');

describe('security headers', () => {
  it('allows scripts from the site only, without unsafe-inline', () => {
    const scriptSrc = read('public/_headers').match(/script-src ([^;]*);/)?.[1];
    expect(scriptSrc).toBe("'self'");
  });

  it('keeps index.html free of inline scripts', () => {
    const scripts = read('index.html').match(/<script\b[^>]*>/g) ?? [];
    expect(scripts).toEqual(['<script type="module" src="/src/main.tsx">']);
  });
});
