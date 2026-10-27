# Commands

This page lists the commands of the project. Run the commands in the project folder.

## mise tasks

The tasks are shell files in `.mise/tasks/`. Run `mise tasks` to see the list.

| Command              | Action                                                            |
| -------------------- | ----------------------------------------------------------------- |
| `mise install`       | Installs the pinned tools: Node.js, npm, pre-commit and gitleaks. |
| `mise run install`   | Installs the dependencies from `package-lock.json` (`npm ci`).    |
| `mise run hooks`     | Installs the Git pre-commit hooks.                                |
| `mise run dev`       | Starts the development server on port `5173`.                     |
| `mise run test`      | Runs the tests one time.                                          |
| `mise run coverage`  | Runs the tests with coverage. Fails below 100%.                   |
| `mise run check`     | Runs the Biome linter and the format check.                       |
| `mise run docs`      | Checks the docs: writing rules, Diátaxis structure and links.     |
| `mise run build`     | Runs the type check and builds the application in `dist`.         |
| `mise run preview`   | Serves `dist` on port `4173`.                                     |
| `mise run pages:dev` | Serves `dist` with Wrangler, as Cloudflare Pages does.            |
| `mise run deploy`    | Builds the application and deploys it to Cloudflare Pages.        |
| `mise run validate`  | Runs all the CI quality gates.                                    |

## npm scripts

| Command                 | Action                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Starts the Vite development server.                           |
| `npm run build`         | Runs `typecheck`, then `vite build`.                          |
| `npm run preview`       | Serves the production build.                                  |
| `npm run test`          | Runs Vitest one time.                                         |
| `npm run test:watch`    | Runs Vitest in watch mode.                                    |
| `npm run test:coverage` | Runs Vitest with V8 coverage. Fails below 100%.               |
| `npm run typecheck`     | Runs `tsc --noEmit`.                                          |
| `npm run lint`          | Runs the Biome linter. A warning is a failure.                |
| `npm run format`        | Formats all files with Biome.                                 |
| `npm run format:check`  | Checks the format of all files.                               |
| `npm run check`         | Runs the Biome linter and the format check.                   |
| `npm run check:fix`     | Corrects the lint and format findings that Biome can correct. |
| `npm run validate`      | Runs `check`, `typecheck`, `test:coverage` and the build.     |
| `npm run pages:dev`     | Serves `dist` with Wrangler.                                  |
| `npm run deploy`        | Builds and deploys to Cloudflare Pages.                       |

## Pre-commit hooks

The hooks run on each commit. CI runs them on each pull request with `pre-commit run --all-files`.

| Hook          | Check                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| File hygiene  | Large files, case conflicts, merge markers, JSON, TOML, YAML, line endings and spaces. |
| `gitleaks`    | Secrets in the staged changes. CI scans the pull request commits instead.              |
| `biome-check` | Lint and format.                                                                       |
| `typecheck`   | TypeScript types.                                                                      |
| `docs-check`  | The docs, with `mise run docs`.                                                        |

## CI workflow

The workflow `.github/workflows/ci.yml` runs on each pull request to `main`. It does not run on a push to `main`.

1. Installs the pinned tools with mise.
2. Installs the dependencies with `npm ci`.
3. Verifies the registry signatures of the dependencies.
4. Scans the pull request commits for secrets.
5. Runs the pre-commit hooks on all files.
6. Runs the tests with coverage.
7. Builds the application.

## Related documents

- [Install and run locally](../how-to/install-and-run-locally.md)
- [Testing strategy](../explanation/testing-strategy.md)
