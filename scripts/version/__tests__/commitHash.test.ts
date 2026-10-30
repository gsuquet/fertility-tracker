import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { readGitHead, resolveCommitHash } from '../commitHash.ts';

const SHA = 'B128CBC0123456789abcdef0123456789abcdef0';

describe('resolveCommitHash', () => {
  it('uses the Cloudflare Pages commit before the other sources', () => {
    const env = { CF_PAGES_COMMIT_SHA: SHA, WORKERS_CI_COMMIT_SHA: 'aaaaaaa' };
    expect(resolveCommitHash(env, () => 'ccccccc')).toBe('b128cbc');
  });

  it('uses the Workers Builds commit when Cloudflare Pages gives none', () => {
    expect(resolveCommitHash({ WORKERS_CI_COMMIT_SHA: 'abcdef12' }, () => null)).toBe('abcdef1');
  });

  it('ignores an empty or invalid variable and uses Git', () => {
    const env = { CF_PAGES_COMMIT_SHA: '', WORKERS_CI_COMMIT_SHA: 'not-a-sha' };
    expect(resolveCommitHash(env, () => `${SHA}\n`)).toBe('b128cbc');
  });

  it('returns null when no source gives a valid SHA', () => {
    expect(resolveCommitHash({}, () => null)).toBeNull();
    expect(resolveCommitHash({}, () => 'abc')).toBeNull();
  });
});

describe('readGitHead', () => {
  it('reads the HEAD commit of this repository', () => {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    expect(readGitHead()).toBe(head);
  });

  it('returns null outside a Git repository', () => {
    expect(readGitHead('/')).toBeNull();
  });
});
