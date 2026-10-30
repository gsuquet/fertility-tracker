# Release a new version

Use this procedure for each change to the application code. The repository rules in `AGENTS.md` require it.

The Dependabot pull requests do not change the version. The next release of the application includes their updates.

## Procedure

1. Before you change the code, write the change in its reference page. [SPEC.md](../../SPEC.md) gives the page of each source file.
2. Change the code. Read [Write a test first](write-a-test-first.md).
3. Increase the version in `package.json`. Use [semantic versioning](https://semver.org/):
   - Increase the patch number for a correction.
   - Increase the minor number for a new feature.
   - Increase the major number for a change that is not compatible with old data.
4. Run `npm install` to write the new version in `package-lock.json`.
5. Add a release at the start of `VERSION_HISTORY` in `src/domain/versionTracker.ts`. Give the text in English and in French.
6. Run all the quality gates:

   ```bash
   mise run validate
   ```

7. Commit the change. Write the message in the [Conventional Commits](../reference/commit-messages.md) format, for example `fix(calendar): show long codes`.
8. Open a pull request. Give it a title in the same format.

## Result

The **About & Version Tracker** dialog shows the new release notes. The version test reads the version from `package.json`. Thus, you do not change the test.

## Related documents

- [Deploy to Cloudflare Pages](deploy-to-cloudflare.md)
