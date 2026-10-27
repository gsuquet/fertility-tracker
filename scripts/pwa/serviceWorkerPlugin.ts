import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

/** Bundles src/sw/entry.ts to dist/sw.js and injects the precache list and the cache name. */

export const SW_FILE_NAME = 'sw.js';
const SW_ENTRY = 'src/sw/entry.ts';
const EXCLUDED = new Set([SW_FILE_NAME, '_headers']);

export interface PrecacheFile {
  /** Path relative to the output folder, with `/` separators. */
  url: string;
  content: string | Uint8Array;
}

export interface Precache {
  cacheName: string;
  precache: string[];
}

/**
 * Returns `./` (the app shell, which is index.html) and every other file to precache. The cache
 * name has the app version and a hash of the names and contents of the files, so each new build
 * gets a new cache.
 */
export function buildPrecache(files: readonly PrecacheFile[], version: string): Precache {
  const included = files
    .filter(f => !EXCLUDED.has(f.url) && !f.url.endsWith('.map'))
    .sort((a, b) => a.url.localeCompare(b.url));
  const hash = createHash('sha256');
  for (const file of included) {
    hash.update(`${file.url}\0`);
    hash.update(file.content);
    hash.update('\0');
  }
  return {
    cacheName: `fertility-tracker-${version}-${hash.digest('hex').slice(0, 8)}`,
    precache: ['./', ...included.map(f => f.url).filter(url => url !== 'index.html')],
  };
}

/** Replaces the build constants of the worker bundle with literal values. */
export function injectServiceWorker(code: string, { cacheName, precache }: Precache): string {
  const values = {
    __SW_CACHE_NAME__: JSON.stringify(cacheName),
    __SW_PRECACHE__: JSON.stringify(precache),
  };
  return Object.entries(values).reduce((out, [name, value]) => {
    if (!out.includes(name)) throw new Error(`${SW_FILE_NAME} does not use ${name}`);
    return out.replaceAll(name, value);
  }, code);
}

/** Lists the files of the public folder, which Vite copies to the output folder. */
export function listPublicFiles(dir: string): PrecacheFile[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => {
      const path = join(entry.parentPath, entry.name);
      return { url: relative(dir, path).split(sep).join('/'), content: readFileSync(path) };
    })
    .sort((a, b) => a.url.localeCompare(b.url));
}

export function serviceWorkerPlugin({ version }: { version: string }): Plugin {
  let publicDir = '';
  return {
    name: 'fertility-tracker:service-worker',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    buildStart() {
      this.emitFile({ type: 'chunk', id: SW_ENTRY, fileName: SW_FILE_NAME });
    },
    generateBundle(_options, bundle) {
      const worker = bundle[SW_FILE_NAME];
      if (worker?.type !== 'chunk') throw new Error(`The bundle has no ${SW_FILE_NAME} chunk`);
      const files = Object.values(bundle).map(output => ({
        url: output.fileName,
        content: output.type === 'chunk' ? output.code : output.source,
      }));
      worker.code = injectServiceWorker(
        worker.code,
        buildPrecache([...files, ...listPublicFiles(publicDir)], version)
      );
    },
  };
}
