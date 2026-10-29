# Version tracker

This page gives the rules for the release notes and the version of the application. For the functions, read [Domain API](domain-api.md#versiontrackerts).

**Source files:** [src/domain/versionTracker.ts](../../src/domain/versionTracker.ts), [src/domain/appVersion.ts](../../src/domain/appVersion.ts)

- `VERSION_HISTORY` has the release notes, newest first. Each release has a version, a date, a title, a tagline, highlights and the CrMS version, in English and French.
- Vite puts the version from `package.json` and the build time into `__APP_VERSION__` and `__BUILD_DATE__`. `appVersion.ts` reads them.
- `checkAndRecordVersionSeen()` in `appVersion.ts` compares the version with `fertility_tracker_last_seen_version` in `localStorage`. Then it saves the current version.
- `appVersion.ts` does not import `versionTracker.ts`. Thus, the release notes stay out of the main chunk ([Code splitting and lazy loading](../../SPEC.md#22-code-splitting-and-lazy-loading)).
- `getStorageStats()` counts the storage keys, the size, the observations and the cycles. It reads the observations with `parseObservationData()` ([Storage format](data-storage.md#storage-format)).

## Related documents

- [Domain API](domain-api.md)
- [Release a new version](../how-to/release-a-new-version.md)
