# Specification and version workflow

Follow the rules in [AGENTS.md](../../AGENTS.md). In summary:

1. Before you change the code, write the change in `SPEC.md`.
2. Write a test that fails before you change the behavior. Keep coverage at 100%. Do not add coverage ignore comments.
3. After the change, increase the version in `package.json`, add a release to `VERSION_HISTORY` and set the version in `SPEC.md`.
4. Write the documentation with the rules in `docs/reference/documentation-rules.md`.
5. Write each commit message and pull request title in the Conventional Commits format: `type(scope)!: description`.
6. Run `mise run validate` before you push.
