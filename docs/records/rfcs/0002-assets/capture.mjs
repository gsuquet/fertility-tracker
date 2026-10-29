// Takes a screenshot of each mockup of RFC 0002 into images/. Run build.mjs first.
// Run from the root of the repository: node docs/records/rfcs/0002-assets/capture.mjs
// The mockups load the tokens from src/styles, so the script serves the whole repository.
import { createReadStream, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = normalize(join(HERE, '../../../..'));
const BASE = relative(ROOT, HERE).split('\\').join('/');
const TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = createServer((req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path)
    .on('error', () => res.end())
    .pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/${BASE}`;

const pages = JSON.parse(readFileSync(join(HERE, 'pages.json'), 'utf8'));
mkdirSync(join(HERE, 'images'), { recursive: true });
// CHROMIUM_PATH selects a Chromium other than the one of npx playwright install
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const p of pages) {
  const phone = p.size === 'phone';
  const page = await browser.newPage({
    viewport: phone ? { width: 430, height: 900 } : { width: 1500, height: 1000 },
    deviceScaleFactor: phone ? 2 : 1,
  });
  await page.goto(`${url}/${p.file}.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#frame').screenshot({ path: join(HERE, 'images', `${p.file}.png`) });
  await page.close();
}
await browser.close();
server.close();
console.log(`${pages.length} screenshots written`);
