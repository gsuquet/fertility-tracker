# Deployment

This page gives the rules for the hosting, the offline use, the installation and the security headers. For the deploy procedures, read [Deploy to Cloudflare Pages](../how-to/deploy-to-cloudflare.md). For the CI workflow, read [Commands](commands.md#ci-workflow).

## Hosting

| Item             | Value                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Platform         | Cloudflare Pages, static site                                                                           |
| Settings         | [wrangler.json](../../wrangler.json): `name` is `fertility-tracker`, `pages_build_output_dir` is `dist` |
| Build command    | `npm run build`, that is `npm run typecheck` (`tsc --noEmit` for `src` and `e2e`) then `vite build`     |
| Deploy command   | `npm run deploy`, that is the build then `wrangler pages deploy dist`                                   |
| Automatic deploy | Cloudflare builds each commit on `main` and a preview for each pull request                             |

## Offline use and installation

**Source files:** [src/sw/serviceWorker.ts](../../src/sw/serviceWorker.ts), [src/sw/entry.ts](../../src/sw/entry.ts), [src/pwa/registerServiceWorker.ts](../../src/pwa/registerServiceWorker.ts), [scripts/pwa/serviceWorkerPlugin.ts](../../scripts/pwa/serviceWorkerPlugin.ts)

The Vite plugin `serviceWorkerPlugin` runs only in a build. It bundles `src/sw/entry.ts` to `dist/sw.js`, with the precache list and the cache name.

- The precache list has `./`, that is the application shell. The server answers `./` with `index.html`, so the list does not have `index.html` under its own name.
- The list also has each other file of the build (all files in `assets/`, also the lazy chunks) and of `public/` (manifest and icons).
- The list does not have source maps, `sw.js`, `_headers` or the files in `screenshots/`. Only the install dialog of the browser uses the screenshots, and the application does not need them offline.
- The list has no font file.
- The cache name is `fertility-tracker-<version>-<hash>`. The hash is the first 8 hexadecimal characters of a SHA-256 of the names and contents of the files.
- Thus, each build with a different output installs a new cache.

| Event      | Action                                                                                                                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install`  | Adds each precache URL to the new cache, with `cache: 'no-cache'`. The browser checks each file with the server, so its HTTP cache cannot give an old shell. It does not call `skipWaiting()`: a new version waits ([Update](../../SPEC.md#update)). |
| `activate` | Deletes each cache whose name starts with `fertility-tracker-` and is not the current cache. Then calls `clients.claim()`.                                                                                                                           |
| `message`  | For the message `SKIP_WAITING`, calls `skipWaiting()`. It ignores other messages.                                                                                                                                                                    |
| `fetch`    | Ignores requests that are not `GET` or that go to another origin.                                                                                                                                                                                    |
- Cache lookups use `ignoreVary: true`. The precache requests have no `Origin` header, but module scripts are CORS requests. Without this option, `Vary: Origin` makes each lookup fail.
- Files in `/assets/` use the cache first. On a cache miss, the service worker fetches the file. It saves a successful response that is not `text/html`.
- After a deploy, the server answers an old file name with `index.html`. The service worker gives this response but does not save it.
- A navigation to the application (`./` or `./index.html`, with any query) gets the application shell from the cache of the active worker. Without it in the cache, the service worker uses the network first. Thus, a new version starts only when its worker activates ([Update](../../SPEC.md#update)).
- Other pages and other files use the network first, and the service worker saves a successful response. Without network, it gives the saved response.
- For a page without a saved response, it gives the application shell (`./`). For other files without a saved response, it gives a network error.

Other rules:

- `src/main.tsx` calls `registerServiceWorker()` after the first render. The function registers `./sw.js` only in a production build (`import.meta.env.PROD`).
- The registration also needs a secure context (`https:` or `localhost`) and a browser with service workers. A failure has no effect. `index.html` has no inline script.
- [public/manifest.webmanifest](../../public/manifest.webmanifest) has three PNG icons: `icons/icon-192.png` (`any`), `icons/icon-512.png` (`any`) and `icons/icon-maskable-512.png` (`maskable`).
- The manifest `id` and `scope` are `./`. Thus, the installed application keeps its identity if `start_url` changes.
- The manifest has `lang` (`en`), `dir` (`ltr`) and `categories` (`health`, `medical`, `lifestyle`).
- `launch_handler` has `client_mode: ["focus-existing", "auto"]`. In Chromium, a second launch shows the open window and does not reload it. Thus, a draft in the drawer stays.
- `shortcuts` has **Log today** and **Chart**, each with `icons/icon-96.png` ([Launch shortcuts](../../SPEC.md#launch-shortcuts)).
- `screenshots` has `screenshots/phone.png` (`narrow`, 780 × 1688) and `screenshots/desktop.png` (`wide`, 1440 × 900). Android shows them in the install dialog. They show only demo data. The task `mise run screenshots` makes them again.
- A test reads the manifest and checks that each icon and screenshot file exists.
- `index.html` has `apple-mobile-web-app-title` (`Fertility Tracker`) and `apple-mobile-web-app-status-bar-style` (`default`). Thus, iOS shows the short name under the icon and the content stays under the status bar.
- The maskable icon has its image in the 80% safe zone. `index.html` uses `icons/apple-touch-icon.png` (180 × 180 pixels) as the `apple-touch-icon` and `icons/logo.svg` as the favicon.
- The manifest `background_color` is `--brand-tile` and `theme_color` is `--brand-ink`, from the light theme. The splash screen of Android fills the screen with `background_color` and puts the icon in the middle. With the color of the logo tile, the screen is navy from edge to edge, and the tile has no visible edge.
- `index.html` has one `theme-color` for each color scheme: `#f8f6f1` (light) and `#13171d` (dark), the `--bg-primary` of each theme. `THEME_COLORS` in `ThemeContext` has these values. When the theme of the app changes, `ThemeContext` sets the color of that theme in each `theme-color`. A browser uses `theme-color` before the manifest `theme_color`.
- The page code does not import `src/sw/`. Else the build puts the worker code in a shared chunk, and `sw.js` cannot import it as a classic worker script. A unit test checks this rule. `registerServiceWorker.ts` has its own copy of the `SKIP_WAITING` message, and a test checks that the two are equal.
- The service worker keeps only application files. It never reads or keeps the observations, which stay in `localStorage`.

## Security headers

**Settings:** [public/\_headers](../../public/_headers)

- `Content-Security-Policy` has `script-src 'self'` without `'unsafe-inline'`. The built `index.html` must not have an inline script.
- `style-src` is `'self' 'unsafe-inline'` and `font-src` is `'self'`. `index.html` loads no stylesheet, font or preconnect from another origin.
- `sw.js` has `Cache-Control: no-cache, no-store, must-revalidate`. Thus, the browser always looks for a new service worker.
- Files in `assets/` are immutable for one year.

## Related documents

- [Deploy to Cloudflare Pages](../how-to/deploy-to-cloudflare.md)
- [Privacy and data storage](../explanation/privacy-and-data-storage.md)
- [Commands](commands.md)
