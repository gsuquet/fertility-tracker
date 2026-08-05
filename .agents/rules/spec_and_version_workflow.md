# Specification & Version Workflow Rules

Follow these rules for all task executions in this repository:

1. **Update `SPEC.md` Before Code Modifications**:
   - Before making any code, UI, or domain engine modifications, inspect `SPEC.md` and update it to reflect the target feature, design decisions, or architectural changes.

2. **Update Version & Release Notes After Code Modifications**:
   - After completing code modifications, bump the application version in `package.json`.
   - Add a new version release object (including version, build date, bilingual title/tagline/highlights) to `VERSION_HISTORY` in `src/domain/versionTracker.ts`.
   - Update version fallbacks in `src/domain/versionTracker.ts` (`getAppVersion()`, `getBuildDate()`).
   - Update version assertions in `src/domain/__tests__/versionTracker.test.ts`.
   - Ensure `SPEC.md` document header and version references match the new version.
