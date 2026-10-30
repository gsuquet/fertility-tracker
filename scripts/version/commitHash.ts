import { execFileSync } from 'node:child_process';

/** Build variables that hold the commit SHA, in order: Cloudflare Pages, then Workers Builds. */
const COMMIT_ENV_VARS = ['CF_PAGES_COMMIT_SHA', 'WORKERS_CI_COMMIT_SHA'] as const;
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const SHORT_LENGTH = 7;

/** Returns the SHA of the HEAD commit, or null when Git or the repository is not available. */
export function readGitHead(cwd?: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Returns the short commit hash of the build, in lowercase. It uses the first build variable with
 * a valid SHA, else Git, else null.
 */
export function resolveCommitHash(
  env: Record<string, string | undefined>,
  readHead: () => string | null = readGitHead
): string | null {
  const isSha = (value: string | null | undefined): value is string =>
    SHA_PATTERN.test(value?.trim() ?? '');
  const fromEnv = COMMIT_ENV_VARS.map(name => env[name]).find(isSha);
  const sha = fromEnv ?? readHead();
  return isSha(sha) ? sha.trim().slice(0, SHORT_LENGTH).toLowerCase() : null;
}
