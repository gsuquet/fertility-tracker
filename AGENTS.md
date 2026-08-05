# Project Agent Guidelines

## Mandatory Workflow Rules

1. **Spec First**: Before modifying any source code or UI components, you MUST update `SPEC.md` to document the planned changes, architecture, or features.
2. **Version & Release Notes After Changes**: After making any code changes:
   - Bump the version in `package.json`.
   - Add a new release entry in `src/domain/versionTracker.ts` (`VERSION_HISTORY`).
   - Update fallback helper functions (`getAppVersion()`, `getBuildDate()`).
   - Update version assertions in `src/domain/__tests__/versionTracker.test.ts`.
   - Sync `SPEC.md` version headers.
