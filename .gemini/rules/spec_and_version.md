# Spec First & Version Update Rule

1. **Before any code modification**: Update `SPEC.md` to document the planned feature or change.
2. **After any code modification**:
   - Bump version in `package.json`.
   - Add new release entry in `src/domain/versionTracker.ts` (`VERSION_HISTORY`).
   - Sync `SPEC.md` version headers.
3. **Test first**: Write a failing test before each behavior change. Keep coverage at 100% on all four metrics. Do not add coverage ignore comments.
