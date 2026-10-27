# Specification & Version Workflow Rules

Follow these rules for all task executions in this repository:

1. **Update `SPEC.md` Before Code Modifications**:
   - Before making any code, UI, or domain engine modifications, inspect `SPEC.md` and update it to reflect the target feature, design decisions, or architectural changes.

2. **Update Version & Release Notes After Code Modifications**:
   - After completing code modifications, bump the application version in `package.json`.
   - Add a new version release object (including version, build date, bilingual title/tagline/highlights) to `VERSION_HISTORY` in `src/domain/versionTracker.ts`.
   - Ensure `SPEC.md` document header and version references match the new version.
   - `src/domain/__tests__/versionTracker.test.ts` reads the version from `package.json`. Do not hard-code it.

3. **Write the Test First**:
   - Write a failing test before you change the behavior of the code. Then write the minimum code to make it pass.
   - Keep coverage at 100% for statements, branches, functions and lines. Do not add coverage ignore comments.
   - Follow `docs/how-to/write-a-test-first.md`.
