# Release a new version

Use this procedure for each change to the application code. The repository rules in `AGENTS.md` require it.

## Procedure

1. Before you change the code, write the change in `SPEC.md`.
2. Change the code. Read [Write a test first](write-a-test-first.md).
3. Increase the version in `package.json`. Use [semantic versioning](https://semver.org/):
   - Increase the patch number for a correction.
   - Increase the minor number for a new feature.
   - Increase the major number for a change that is not compatible with old data.
4. Run `npm install` to write the new version in `package-lock.json`.
5. Add a release at the start of `VERSION_HISTORY` in `src/domain/versionTracker.ts`. Give the text in English and in French.
6. Set **Document Version** and **Last Updated** at the top of `SPEC.md`.
7. Run all the quality gates:

   ```bash
   mise run validate
   ```

8. Open a pull request.

## Result

The **About & Version Tracker** dialog shows the new release notes. The version test reads the version from `package.json`. Thus, you do not change the test.

## Related documents

- [Deploy to Cloudflare Pages](deploy-to-cloudflare.md)
