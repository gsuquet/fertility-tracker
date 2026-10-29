# Commit messages

This page gives the format of commit messages and pull request titles. The format is [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The check is in `scripts/commits/checkCommitMessage.ts`.

## Format

```text
type(scope)!: description

Optional body.

Optional footers, for example BREAKING CHANGE: description
```

| Part          | Rule                                                                                 |
| ------------- | ------------------------------------------------------------------------------------ |
| `type`        | Required. One type from the table below, in lowercase.                               |
| `(scope)`     | Optional. The part of the project, in lowercase. For example `spec`, `ci` or `deps`. |
| `!`           | Optional. Shows a change that is not compatible with the previous version.           |
| `description` | Required. Starts after a colon and a space. Use the imperative: "add", not "added".  |
| Header        | A maximum of 100 characters.                                                         |
| Body          | Optional. A blank line must separate the header and the body.                        |

## Types

| Type       | Use it for                                                        |
| ---------- | ----------------------------------------------------------------- |
| `feat`     | A new function for the user.                                      |
| `fix`      | The correction of a bug.                                          |
| `docs`     | A change to the docs, `README.md`, `AGENTS.md` or `SPEC.md` only. |
| `test`     | A new test or a change to a test only.                            |
| `refactor` | A change to the code that does not change the behavior.           |
| `perf`     | A change that makes the application faster.                       |
| `style`    | A change to the format of the code only.                          |
| `build`    | A change to the build, the dependencies or the tool versions.     |
| `ci`       | A change to the CI workflow or the Git hooks.                     |
| `chore`    | Other maintenance that does not change `src/` or the tests.       |
| `revert`   | The reversal of a previous commit.                                |

## Messages that Git writes

The commit message check accepts these messages without a type. The pull request title check does not accept them.

| Start of the header              | Source               |
| -------------------------------- | -------------------- |
| `Merge `                         | `git merge`          |
| `Revert "`                       | `git revert`         |
| `fixup! `, `squash! `, `amend! ` | `git commit --fixup` |

## Checks

| Where         | What                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| Your computer | The `conventional-commit` hook checks each commit message. `mise run hooks` installs it.                     |
| CI            | The `pr-title` workflow checks the pull request title with `--strict`. It runs again when the title changes. |
| Manual        | `mise run commit-msg FILE` checks a file. Without `FILE`, it reads the standard input.                       |
| Strict mode   | `--strict` also rejects the messages that Git writes. A squash merge uses the title as the commit message.   |

## Dependabot

Dependabot writes `build(deps)` titles for npm and `ci(deps)` titles for GitHub Actions. The prefixes are in `commit-message.prefix` in `.github/dependabot.yml`.

## Examples

| Header                                       | Result                   |
| -------------------------------------------- | ------------------------ |
| `feat(calendar): show the week numbers`      | Correct                  |
| `fix: keep the red stamp on B days`          | Correct                  |
| `docs(spec)!: remove the Spanish language`   | Correct                  |
| `Add the week numbers`                       | Incorrect: no type       |
| `feature: show the week numbers`             | Incorrect: unknown type  |
| `fix:keep the red stamp`                     | Incorrect: no space      |
| `fix: keep the stamp`, then a body on line 2 | Incorrect: no blank line |

## Related documents

- [Commands](commands.md)
- [Release a new version](../how-to/release-a-new-version.md)
