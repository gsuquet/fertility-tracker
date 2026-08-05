# Spec First & Version Update Rule

1. **Before any code modification**: Update `SPEC.md` to document the planned feature or change.
2. **After any code modification**:
   - Bump version in `package.json`.
   - Add new release entry in `src/domain/versionTracker.ts` (`VERSION_HISTORY`).
   - Update version fallbacks in `src/domain/versionTracker.ts`.
   - Update tests in `src/domain/__tests__/versionTracker.test.ts`.
   - Sync `SPEC.md` version headers.
