/**
 * Checks that a commit message or a pull request title follows Conventional Commits 1.0.0.
 * Run it with `mise run commit-msg FILE`, or give the message on the standard input.
 * With `--strict`, it also rejects the messages that Git writes. CI uses it for pull request titles.
 */
import { readFileSync } from 'node:fs';

export const TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
] as const;

const MAX_HEADER_LENGTH = 100;

const HEADER = /^(?<type>[A-Za-z]+)(?:\([a-z0-9][a-z0-9._/-]*\))?!?: \S/;

/** Messages that Git writes. They do not have to follow Conventional Commits. */
const GIT_MESSAGES = /^(?:Merge |Revert "|(?:fixup|squash|amend)! )/;

/** Returns the first line that is not empty and not a Git comment. */
export function headerOf(message: string): string {
  const lines = message.split('\n').map(line => line.trimEnd());
  return lines.find(line => line !== '' && !line.startsWith('#')) ?? '';
}

/** Tells if the line after the header, when there is one, is empty. Git comment lines do not count. */
function bodyIsSeparated(message: string, header: string): boolean {
  const lines = message
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => !line.startsWith('#'));
  const next = lines[lines.indexOf(header) + 1];
  return next === undefined || next === '';
}

/** Returns the errors in a commit message. An empty list means that it is correct. */
export function checkCommitMessage(message: string, strict = false): string[] {
  const header = headerOf(message);
  if (header === '') return ['The commit message is empty.'];
  if (!strict && GIT_MESSAGES.test(header)) return [];

  const errors: string[] = [];
  const type = HEADER.exec(header)?.groups?.type;
  if (type === undefined) {
    errors.push(
      'The header must have the format "type(scope)!: description". The scope and "!" are optional.'
    );
  } else if (!(TYPES as readonly string[]).includes(type)) {
    errors.push(`The type "${type}" is not permitted. Use one of: ${TYPES.join(', ')}.`);
  }
  if (header.length > MAX_HEADER_LENGTH) {
    errors.push(`The header has ${header.length} characters. The maximum is ${MAX_HEADER_LENGTH}.`);
  }
  if (!bodyIsSeparated(message, header)) {
    errors.push('Put a blank line between the header and the body.');
  }
  return errors;
}

/**
 * Checks the message in the file argument, else the message on the standard input.
 * The argument `--strict` rejects the messages that Git writes.
 */
export function main(args: string[], stdin: string): number {
  const strict = args.includes('--strict');
  const file = args.find(arg => arg !== '--strict');
  const message = file === undefined ? stdin : readFileSync(file, 'utf8');
  const errors = checkCommitMessage(message, strict);
  if (errors.length === 0) return 0;

  console.log(`Commit message "${headerOf(message)}":`);
  for (const error of errors) console.log(`  ${error}`);
  console.log('Read docs/reference/commit-messages.md.');
  return 1;
}
