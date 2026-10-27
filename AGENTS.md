# Rules for coding agents

These rules apply to each change in this repository. They apply to people too.

## Required workflow

1. Before you change the code, write the change in `SPEC.md`.
2. Write a test that fails before you change the behavior. Then write the minimum code that makes it pass. Read [Write a test first](docs/how-to/write-a-test-first.md).
3. Keep coverage at 100% for statements, branches, functions and lines. Do not add coverage ignore comments. Remove code that no test can reach.
4. After the change, do the procedure in [Release a new version](docs/how-to/release-a-new-version.md):
   - Increase the version in `package.json`.
   - Add a release to `VERSION_HISTORY` in `src/domain/versionTracker.ts`, in English and French.
   - Set the version and the date at the top of `SPEC.md`.
   - Do not write the version in `src/domain/__tests__/versionTracker.test.ts`. The test reads it from `package.json`.
5. When you change the documentation, follow [Documentation rules](docs/reference/documentation-rules.md).
6. Before you push, run `mise run validate`. All the checks must pass.

## Tools

- Pin each tool and each dependency to an exact version.
- Put each task in a shell file in `.mise/tasks/`.
- CI runs on pull requests only. It does not run on `main`.
