import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPrecache,
  injectServiceWorker,
  listPublicFiles,
  SW_FILE_NAME,
  serviceWorkerPlugin,
} from '../serviceWorkerPlugin.ts';

const files = [
  { url: 'index.html', content: '<html></html>' },
  { url: 'assets/index-abc.js', content: 'main' },
  { url: 'assets/index-abc.js.map', content: '{}' },
  { url: 'icons/icon-192.png', content: new Uint8Array([1, 2, 3]) },
  { url: '_headers', content: '/*' },
  { url: SW_FILE_NAME, content: 'worker' },
  { url: 'screenshots/phone.png', content: new Uint8Array([4, 5, 6]) },
];

describe('buildPrecache', () => {
  it('lists the app shell and every build file, without maps, headers, worker and screenshots', () => {
    expect(buildPrecache(files, '1.16.0').precache).toEqual([
      './',
      'assets/index-abc.js',
      'icons/icon-192.png',
    ]);
  });

  it('names the cache after the version and a hash of the files', () => {
    const { cacheName } = buildPrecache(files, '1.16.0');
    expect(cacheName).toMatch(/^fertility-tracker-1\.16\.0-[0-9a-f]{8}$/);
    expect(buildPrecache([...files].reverse(), '1.16.0').cacheName).toBe(cacheName);
  });

  it('changes the cache name when a file content changes', () => {
    const changed = files.map(f => (f.url === 'index.html' ? { ...f, content: 'new' } : f));
    expect(buildPrecache(changed, '1.16.0').cacheName).not.toBe(
      buildPrecache(files, '1.16.0').cacheName
    );
  });
});

describe('injectServiceWorker', () => {
  it('replaces the build constants with literal values', () => {
    const code = 'install(self,{cacheName:__SW_CACHE_NAME__,precache:__SW_PRECACHE__});';
    expect(injectServiceWorker(code, { cacheName: 'c-1', precache: ['./', 'a.js'] })).toBe(
      'install(self,{cacheName:"c-1",precache:["./","a.js"]});'
    );
  });

  it('fails when the bundle lost a constant', () => {
    expect(() => injectServiceWorker('install()', { cacheName: 'c', precache: [] })).toThrow(
      '__SW_CACHE_NAME__'
    );
  });
});

describe('with a public folder', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'pwa-'));
    mkdirSync(join(root, 'icons'));
    writeFileSync(join(root, 'manifest.webmanifest'), '{}');
    writeFileSync(join(root, 'icons', 'icon-192.png'), 'png');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lists the public files with URL paths', () => {
    expect(listPublicFiles(root).map(f => f.url)).toEqual([
      'icons/icon-192.png',
      'manifest.webmanifest',
    ]);
  });

  it('emits the worker chunk and injects the precache list of the bundle', () => {
    const plugin = serviceWorkerPlugin({ version: '1.16.0' });
    expect(plugin.apply).toBe('build');

    (plugin.configResolved as (config: { publicDir: string }) => void)({ publicDir: root });
    const emitFile = vi.fn();
    (plugin.buildStart as (this: unknown) => void).call({ emitFile });
    expect(emitFile).toHaveBeenCalledWith({
      type: 'chunk',
      id: 'src/sw/entry.ts',
      fileName: SW_FILE_NAME,
    });

    const worker = {
      type: 'chunk',
      fileName: SW_FILE_NAME,
      code: 'go(__SW_CACHE_NAME__,__SW_PRECACHE__)',
    };
    const bundle = {
      'index.html': { type: 'asset', fileName: 'index.html', source: '<html></html>' },
      'assets/index-abc.js': { type: 'chunk', fileName: 'assets/index-abc.js', code: 'main' },
      [SW_FILE_NAME]: worker,
    };
    (plugin.generateBundle as (options: unknown, bundle: unknown) => void)({}, bundle);
    expect(worker.code).toMatch(
      /^go\("fertility-tracker-1\.16\.0-[0-9a-f]{8}",\["\.\/","assets\/index-abc\.js","icons\/icon-192\.png","manifest\.webmanifest"\]\)$/
    );
  });

  it('fails the build when the worker chunk is missing', () => {
    const plugin = serviceWorkerPlugin({ version: '1.16.0' });
    (plugin.configResolved as (config: { publicDir: string }) => void)({ publicDir: root });
    expect(() =>
      (plugin.generateBundle as (options: unknown, bundle: unknown) => void)({}, {})
    ).toThrow(SW_FILE_NAME);
  });
});
