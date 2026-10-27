import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkCommitMessage, headerOf, main } from '../checkCommitMessage.ts';

describe('headerOf', () => {
  it('returns the first line that is not empty and not a comment', () => {
    expect(headerOf('# Please enter a message\n\nfeat: add a page\n\nBody text.\n')).toBe(
      'feat: add a page'
    );
  });

  it('removes the spaces at the end of the line', () => {
    expect(headerOf('fix: correct the stamp  \r\n')).toBe('fix: correct the stamp');
  });

  it('returns an empty string when the message has no text', () => {
    expect(headerOf('# only a comment\n\n')).toBe('');
  });
});

describe('checkCommitMessage', () => {
  it.each([
    'feat: add the PNG export',
    'fix(calendar): show the code on two lines',
    'docs(spec)!: remove the Spanish language',
    'build(deps): bump vite to 8.3.5',
    'ci: check the pull request title',
    'chore: update the lockfile',
    'perf: memoize the cycles',
    'refactor(domain): split the peak detector',
    'revert: feat: add the PNG export',
    'style: format the CSS',
    'test: cover the parser',
  ])('accepts "%s"', header => {
    expect(checkCommitMessage(header)).toEqual([]);
  });

  it.each([
    'Merge branch main into feature',
    'Revert "feat: add the PNG export"',
    'fixup! feat: add the PNG export',
    'squash! fix: correct the stamp',
    'amend! fix: correct the stamp',
  ])('accepts the Git message "%s"', header => {
    expect(checkCommitMessage(header)).toEqual([]);
  });

  it('rejects an empty message', () => {
    expect(checkCommitMessage('')).toEqual(['The commit message is empty.']);
  });

  it('rejects a header without a type', () => {
    expect(checkCommitMessage('Add the PNG export')).toEqual([
      'The header must have the format "type(scope)!: description". The scope and "!" are optional.',
    ]);
  });

  it('rejects a type that is not in the list', () => {
    expect(checkCommitMessage('feature: add the PNG export')).toEqual([
      'The type "feature" is not permitted. Use one of: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.',
    ]);
  });

  it('rejects an uppercase type', () => {
    expect(checkCommitMessage('Feat: add the PNG export')[0]).toContain(
      'The type "Feat" is not permitted.'
    );
  });

  it('rejects an empty scope and a description without text', () => {
    expect(checkCommitMessage('fix(): correct')).toHaveLength(1);
    expect(checkCommitMessage('fix: ')).toHaveLength(1);
    expect(checkCommitMessage('fix:correct')).toHaveLength(1);
  });

  it('rejects a header longer than 100 characters', () => {
    expect(checkCommitMessage(`fix: ${'a'.repeat(96)}`)).toEqual([
      'The header has 101 characters. The maximum is 100.',
    ]);
  });
});

describe('main', () => {
  let dir: string;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'commit-msg-'));
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    log.mockRestore();
  });

  it('reads the message file and returns 0 for a correct message', () => {
    const file = join(dir, 'COMMIT_EDITMSG');
    writeFileSync(file, 'feat: add a page\n');
    expect(main([file], '')).toBe(0);
    expect(log).not.toHaveBeenCalled();
  });

  it('reads the standard input when there is no file and returns 1 for an incorrect message', () => {
    expect(main([], 'Add a page')).toBe(1);
    expect(log).toHaveBeenCalledWith('Commit message "Add a page":');
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Read docs/reference/commit-messages.md')
    );
  });
});
