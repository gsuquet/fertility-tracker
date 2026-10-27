import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicDir = join(__dirname, '..', '..', 'public');

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8')) as {
  start_url: string;
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
});
