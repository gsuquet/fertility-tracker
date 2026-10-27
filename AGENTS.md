# Project Agent Guidelines

## Mandatory Workflow Rules

1. **Spec First**: Before modifying any source code or UI components, you MUST update `SPEC.md` to document the planned changes, architecture, or features.
2. **Version & Release Notes After Changes**: After making any code changes:
   - Bump the version in `package.json`.
   - Add a new release entry in `src/domain/versionTracker.ts` (`VERSION_HISTORY`).
   - Sync `SPEC.md` version headers.
   - `src/domain/__tests__/versionTracker.test.ts` reads the version from `package.json`. Do not hard-code it.
3. **Test First**: Write a failing test before you change the behavior of the code. Then write the minimum code to make it pass. Read [docs/how-to/write-a-test-first.md](docs/how-to/write-a-test-first.md).
4. **Full Coverage**: `npm run test:coverage` fails below 100% statements, branches, functions or lines. Do not add coverage ignore comments. Remove code that no test can reach.
