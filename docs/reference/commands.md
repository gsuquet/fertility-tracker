# Commands

This page lists the commands of the project. Run the commands in the project folder.

## mise tasks

The tasks are shell files in `.mise/tasks/`. Run `mise tasks` to see the list.

| Command               | Action                                                               |
| --------------------- | -------------------------------------------------------------------- |
| `mise install`        | Installs the pinned tools: Node.js, npm, pre-commit and gitleaks.    |
| `mise run install`    | Installs the dependencies from `package-lock.json` (`npm ci`).       |
| `mise run hooks`      | Installs the Git pre-commit and commit-msg hooks.                    |
| `mise run commit-msg` | Checks a commit message. Read [Commit messages](commit-messages.md). |
| `mise run dev`        | Starts the development server on port `5173`.                        |
| `mise run test`       | Runs the tests one time.                                             |
| `mise run coverage`   | Runs the tests with coverage. Fails below 100%.                      |
| `mise run check`      | Runs the Biome linter and the format check.                          |
| `mise run docs`       | Checks the docs: writing rules, Diátaxis structure and links.        |
| `mise run e2e`        | Runs the Playwright end-to-end and accessibility tests.              |
| `mise run icons`      | Draws the PNG app icons from `public/icons/logo.svg`.                |
| `mise run build`      | Runs the type check and builds the application in `dist`.            |
| `mise run preview`    | Serves `dist` on port `4173`.                                        |
| `mise run pages:dev`  | Serves `dist` with Wrangler, as Cloudflare Pages does.               |
| `mise run deploy`     | Builds the application and deploys it to Cloudflare Pages.           |
| `mise run validate`   | Runs all the CI quality gates.                                       |

## npm scripts

| Command                 | Action                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Starts the Vite development server.                               |
| `npm run build`         | Runs `typecheck`, then `vite build`.                              |
| `npm run preview`       | Serves the production build.                                      |
| `npm run test`          | Runs Vitest one time.                                             |
| `npm run test:watch`    | Runs Vitest in watch mode.                                        |
| `npm run test:coverage` | Runs Vitest with V8 coverage. Fails below 100%.                   |
| `npm run test:e2e`      | Builds the application and runs the Playwright tests in Chromium. |
| `npm run typecheck`     | Runs `tsc --noEmit` on the application and on `e2e/`.             |
| `npm run lint`          | Runs the Biome linter. A warning is a failure.                    |
| `npm run format`        | Formats all files with Biome.                                     |
| `npm run format:check`  | Checks the format of all files.                                   |
| `npm run check`         | Runs the Biome linter and the format check.                       |
| `npm run check:fix`     | Corrects the lint and format findings that Biome can correct.     |
| `npm run validate`      | Runs `check`, `typecheck`, `test:coverage` and the build.         |
| `npm run pages:dev`     | Serves `dist` with Wrangler.                                      |
| `npm run deploy`        | Builds and deploys to Cloudflare Pages.                           |

## Pre-commit hooks

The hooks run on each commit. CI runs them on each pull request with `pre-commit run --all-files`.

| Hook                  | Check                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| File hygiene          | Large files, case conflicts, merge markers, JSON, TOML, YAML, line endings and spaces. |
| `gitleaks`            | Secrets in the staged changes. CI scans the pull request commits instead.              |
| `biome-check`         | Lint and format.                                                                       |
| `typecheck`           | TypeScript types.                                                                      |
| `docs-check`          | The docs, with `mise run docs`.                                                        |
| `conventional-commit` | The commit message. It runs at the `commit-msg` stage. CI does not run it.             |

## CI workflow

The workflow `.github/workflows/ci.yml` runs on each pull request to `main`. It does not run on a push to `main`. The job `validate` does these steps:

1. Installs the pinned tools with mise.
2. Installs the dependencies with `npm ci`.
3. Verifies the registry signatures of the dependencies.
4. Scans the pull request commits for secrets.
5. Runs the pre-commit hooks on all files.
6. Runs the tests with coverage.
7. Builds the application.

The job `e2e` runs at the same time, on pull requests only.

1. Installs the pinned tools with mise.
2. Installs the dependencies with `npm ci`.
3. Installs Chromium with `npx playwright install --with-deps chromium`.
4. Runs `npm run test:e2e`.
5. Keeps the Playwright report for 7 days if a test fails.

The workflow `.github/workflows/pr-title.yml` checks that the pull request title follows [Conventional Commits](commit-messages.md). It runs when a pull request opens, changes or gets new commits.

## Related documents

- [Install and run locally](../how-to/install-and-run-locally.md)
- [Testing strategy](../explanation/testing-strategy.md)
