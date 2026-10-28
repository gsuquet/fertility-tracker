import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_COLORS } from '../context/ThemeContext';

const rootDir = join(__dirname, '..', '..');
const publicDir = join(rootDir, 'public');
const indexHtml = readFileSync(join(rootDir, 'index.html'), 'utf8');
const tokensCss = readFileSync(join(rootDir, 'src', 'styles', 'tokens', 'tokens.css'), 'utf8');

/** Reads one custom property of a theme block in tokens.css. */
const tokenOf = (opener: string, name: string) => {
  const start = tokensCss.indexOf(opener);
  const block = tokensCss.slice(start, tokensCss.indexOf('}', start));
  return new RegExp(`${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(block)?.[1];
};
const lightToken = (name: string) => tokenOf(':root {', name);
const darkToken = (name: string) => tokenOf("[data-theme='dark'] {", name);

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8')) as {
  start_url: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
};

/** Reads the width and height from the IHDR chunk of a PNG file. */
const pngSize = (src: string) => {
  const png = readFileSync(join(publicDir, src));
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
};

describe('web app manifest', () => {
  it('starts at the app shell that the service worker caches', () => {
    expect(manifest.start_url).toBe('./');
  });

  it('lists PNG icons of 192 and 512 pixels and a maskable icon', () => {
    expect(manifest.icons.map(icon => [icon.sizes, icon.purpose])).toEqual([
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ]);
  });

  it('points each icon to a PNG file of the declared size', () => {
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
      expect(pngSize(icon.src)).toBe(icon.sizes);
    }
  });

  it('takes its colors from the light theme of the design tokens', () => {
    expect(manifest.background_color).toBe(lightToken('--bg-primary'));
    expect(manifest.theme_color).toBe(lightToken('--brand-ink'));
  });
});

describe('brand icons in index.html', () => {
  it('uses the SVG sprout logo as the favicon', () => {
    expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="./icons/logo.svg" />');
    expect(readFileSync(join(publicDir, 'icons', 'logo.svg'), 'utf8')).toMatch(/^<svg /);
  });

  it('gives iOS an Apple touch icon of 180 pixels', () => {
    expect(indexHtml).toContain(
      '<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />'
    );
    expect(pngSize('icons/apple-touch-icon.png')).toBe('180x180');
  });

  it('sets the browser theme color of each color scheme from the page background', () => {
    expect(THEME_COLORS).toEqual({
      light: lightToken('--bg-primary'),
      dark: darkToken('--bg-primary'),
    });
    expect(indexHtml).toContain(
      `<meta name="theme-color" content="${THEME_COLORS.light}" media="(prefers-color-scheme: light)" />`
    );
    expect(indexHtml).toContain(
      `<meta name="theme-color" content="${THEME_COLORS.dark}" media="(prefers-color-scheme: dark)" />`
    );
  });
});
