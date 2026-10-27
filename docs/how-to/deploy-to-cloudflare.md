# Deploy to Cloudflare Pages

Use these procedures to put a new version of the application on [fertility-tracker.gsuquet.com](https://fertility-tracker.gsuquet.com). Cloudflare Pages hosts the site.

## Deploy with a merge to main

Cloudflare Pages has a connection to the GitHub repository. It builds and deploys each commit on `main`.

1. Open a pull request.
2. Wait until the CI workflow passes.
3. Open the preview URL that Cloudflare adds to the pull request. Make sure that the change works.
4. Merge the pull request.

Cloudflare uses these build settings:

| Setting          | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| Framework preset | Vite                                                     |
| Build command    | `npm run build`                                          |
| Output folder    | `dist`                                                   |
| Node.js version  | `26.12.1`, from the `.node-version` file                 |
| npm version      | `11.20.0`, the version that comes with Node.js `26.12.1` |

> **CAUTION:** Do not set the `NODE_VERSION` variable in the Cloudflare Pages project. The variable replaces the version in `.node-version`. Then the npm version does not agree with `package.json`, and the build stops.

## Deploy from your computer

Do this procedure only when the automatic deployment is not available.

1. Log in to Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Build and deploy:

   ```bash
   mise run deploy
   ```

## Test the production build with Wrangler

1. Build the application:

   ```bash
   mise run build
   ```

2. Serve the `dist` folder as Cloudflare Pages does:

   ```bash
   mise run pages:dev
   ```

## Related documents

- [Commands](../reference/commands.md)
- [Release a new version](release-a-new-version.md)
