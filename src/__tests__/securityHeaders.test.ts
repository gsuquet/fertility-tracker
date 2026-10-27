import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(__dirname, '..', '..', path), 'utf8');

const directive = (name: string) =>
  read('public/_headers').match(new RegExp(`${name} ([^;]*);`))?.[1];

describe('security headers', () => {
  it('allows scripts from the site only, without unsafe-inline', () => {
    expect(directive('script-src')).toBe("'self'");
  });

  it('allows styles and fonts from the site only, without a third-party host', () => {
    expect(directive('style-src')).toBe("'self' 'unsafe-inline'");
    expect(directive('font-src')).toBe("'self'");
    expect(read('public/_headers')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it('keeps index.html free of inline scripts', () => {
    const scripts = read('index.html').match(/<script\b[^>]*>/g) ?? [];
    expect(scripts).toEqual(['<script type="module" src="/src/main.tsx">']);
  });

  it('loads no stylesheet, font or preconnect from another origin in index.html', () => {
    const links = read('index.html').match(/<link\b[^>]*>/g) ?? [];
    const external = links.filter(link => /href="(https?:)?\/\//.test(link));
    expect(external).toEqual([
      '<link rel="canonical" href="https://fertility-tracker.gsuquet.com/" />',
    ]);
    expect(read('index.html')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
