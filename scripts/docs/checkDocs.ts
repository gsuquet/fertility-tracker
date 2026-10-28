/**
 * Checks the Markdown documentation against a subset of ASD-STE100 Simplified Technical English
 * and the Diátaxis structure. Run it with `mise run docs`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

export interface Finding {
  file: string;
  line: number;
  message: string;
}

type LineFinding = Omit<Finding, 'file'>;

export interface ProseBlock {
  line: number;
  text: string;
  step: boolean;
}

const MAX_STEP_WORDS = 20;
const MAX_DESCRIPTIVE_WORDS = 25;
const MAX_PARAGRAPH_SENTENCES = 6;

const DIATAXIS_FOLDERS = ['tutorials', 'how-to', 'reference', 'explanation'];
const PROCEDURE_FOLDERS = ['tutorials', 'how-to'];
const RECORD_FOLDERS = ['adr', 'records/rfcs', 'records/adrs'];

/** Words that STE does not approve, with the approved word to use. */
const NOT_APPROVED: Record<string, string> = {
  utilize: 'use',
  utilizes: 'uses',
  leverage: 'use',
  ensure: 'make sure',
  ensures: 'makes sure',
  via: 'through',
  'e.g.': 'for example',
  'i.e.': 'that is',
  'etc.': 'a full list',
  please: 'the instruction only',
  simply: 'the instruction only',
  easily: 'the instruction only',
  seamless: 'a specific word',
  seamlessly: 'a specific word',
  robust: 'a specific word',
  comprehensive: 'full',
  should: 'must',
  could: 'can',
  might: 'can',
  whilst: 'while',
  'in order to': 'to',
  'prior to': 'before',
  approximately: 'about',
  numerous: 'many',
  commence: 'start',
  terminate: 'stop',
};

const CONTRACTION =
  /\b[A-Za-z]+n't\b|\b(?:it|that|there|what|here|let)'s\b|\b[A-Za-z]+'(?:re|ll|ve|d)\b/gi;

/** Returns the prose of a Markdown file: paragraphs and list items, without code or tables. */
export function proseBlocks(markdown: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  let current: ProseBlock | undefined;
  let inFence = false;

  const flush = () => {
    if (current) blocks.push(current);
    current = undefined;
  };

  for (const [index, raw] of markdown.split('\n').entries()) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      inFence = !inFence;
      flush();
      continue;
    }
    if (inFence) continue;
    if (line === '' || /^(#|\||<!--|---)/.test(line)) {
      flush();
      continue;
    }

    const item = /^(?:(\d+)\.|[-*])\s+(.*)$/.exec(line);
    if (item) {
      flush();
      current = { line: index + 1, text: String(item[2]), step: item[1] !== undefined };
    } else if (current) {
      current.text += ` ${line.replace(/^>\s*/, '')}`;
    } else {
      current = { line: index + 1, text: line.replace(/^>\s*/, ''), step: false };
    }
  }
  flush();

  return blocks.map(block => ({ ...block, text: plainText(block.text) }));
}

function plainText(text: string): string {
  return text
    .replace(/`[^`]*`/g, 'CODE')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"])/)
    .map(sentence => sentence.trim())
    .filter(sentence => /[A-Za-z0-9]/.test(sentence));
}

const wordCount = (sentence: string) =>
  sentence.split(/\s+/).filter(word => /\w/.test(word)).length;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Checks sentence length, paragraph length, approved words and contractions. */
export function checkProse(markdown: string): LineFinding[] {
  const findings: LineFinding[] = [];

  for (const block of proseBlocks(markdown)) {
    const report = (message: string) => findings.push({ line: block.line, message });
    const blockSentences = sentences(block.text);

    for (const sentence of blockSentences) {
      const words = wordCount(sentence);
      const limit = block.step ? MAX_STEP_WORDS : MAX_DESCRIPTIVE_WORDS;
      if (words > limit) {
        const kind = block.step ? 'a procedure step' : 'descriptive text';
        report(`Sentence has ${words} words. The limit for ${kind} is ${limit}.`);
      }
    }

    if (blockSentences.length > MAX_PARAGRAPH_SENTENCES) {
      report(
        `Paragraph has ${blockSentences.length} sentences. The limit is ${MAX_PARAGRAPH_SENTENCES}.`
      );
    }

    for (const [word, approved] of Object.entries(NOT_APPROVED)) {
      const pattern = new RegExp(`(?<![\\w.])${escapeRegExp(word)}(?![\\w])`, 'i');
      if (pattern.test(block.text)) report(`Do not use "${word}". Use "${approved}".`);
    }

    for (const match of block.text.matchAll(CONTRACTION)) {
      report(`Do not use the contraction "${match[0]}".`);
    }
  }

  return findings;
}

/** Returns the GitHub anchors of the headings of a Markdown file. */
export function headingSlugs(markdown: string): Set<string> {
  const slugs = new Set<string>();
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (line.trim().startsWith('```')) inFence = !inFence;
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (!inFence && heading) {
      slugs.add(
        String(heading[1])
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, '')
          .trim()
          .replace(/\s/g, '-')
      );
    }
  }
  return slugs;
}

const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

/** Checks that each relative link goes to a file, and to a heading when it has an anchor. */
export function checkLinks(file: string, markdown: string, root: string): LineFinding[] {
  const findings: LineFinding[] = [];

  for (const [index, line] of markdown.split('\n').entries()) {
    for (const match of line.matchAll(LINK)) {
      const target = String(match[1]);
      if (/^[a-z]+:/i.test(target)) continue;

      const [path = '', anchor] = target.split('#');
      const targetFile = path ? normalize(join(dirname(file), path)) : file;
      const absolute = join(root, targetFile);
      const report = (message: string) => findings.push({ line: index + 1, message });

      if (path && !existsSync(absolute)) {
        report(`Link target "${target}" does not exist.`);
      } else if (anchor && targetFile.endsWith('.md')) {
        const content = targetFile === file ? markdown : readFileSync(absolute, 'utf8');
        if (!headingSlugs(content).has(anchor)) {
          report(`Link target "${target}" has no heading "${anchor}".`);
        }
      }
    }
  }

  return findings;
}

function walk(root: string, folder: string): string[] {
  return readdirSync(join(root, folder), { withFileTypes: true }).flatMap(entry => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return walk(root, path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

/** Lists the documentation files: README.md, AGENTS.md, SPEC.md and the pages in docs/. */
export function listMarkdownFiles(root: string): string[] {
  const topLevel = ['README.md', 'AGENTS.md', 'SPEC.md'].filter(file =>
    existsSync(join(root, file))
  );
  const docs = existsSync(join(root, 'docs')) ? walk(root, 'docs') : [];
  return [...topLevel, ...docs].sort();
}

/** Checks that each page has one Diátaxis type, has an index entry and, for guides, has steps. */
export function checkDiataxis(root: string): Finding[] {
  const findings: Finding[] = [];
  const indexPath = join(root, 'docs', 'README.md');
  const index = readFileSync(indexPath, 'utf8');
  const indexed = new Set(
    [...index.matchAll(LINK)].map(match =>
      normalize(join('docs', String(match[1]).replace(/#.*/, '')))
    )
  );

  for (const file of listMarkdownFiles(root).filter(f => f.startsWith('docs/'))) {
    if (file === 'docs/README.md') continue;
    const report = (message: string) => findings.push({ file, line: 1, message });
    const parts = relative('docs', file).split('/');
    const folder = String(parts[0]);
    const recordFolder = parts[0] === 'records' ? parts.slice(0, 2).join('/') : folder;

    if (PROCEDURE_FOLDERS.includes(folder)) {
      const content = readFileSync(join(root, file), 'utf8');
      if (!proseBlocks(content).some(block => block.step)) {
        report(`A ${folder === 'how-to' ? 'how-to guide' : 'tutorial'} must have numbered steps.`);
      }
    }
    if (!DIATAXIS_FOLDERS.includes(folder) && !RECORD_FOLDERS.includes(recordFolder)) {
      report(
        'Put the page in tutorials, how-to, reference or explanation. Put a record in adr, records/rfcs or records/adrs.'
      );
    }
    if (!indexed.has(file)) report('docs/README.md does not link to this page.');
  }

  return findings;
}

/** Runs every check, prints the findings and returns how many there are. */
export function main(root: string): number {
  const files = listMarkdownFiles(root);
  const findings: Finding[] = [...checkDiataxis(root)];

  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf8');
    for (const finding of [...checkLinks(file, content, root), ...checkProse(content)]) {
      findings.push({ file, ...finding });
    }
  }

  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  for (const { file, line, message } of findings) console.log(`${file}:${line}: ${message}`);

  if (findings.length === 0) {
    console.log(`Documentation check passed: ${files.length} files.`);
  } else {
    const noun = findings.length === 1 ? 'finding' : 'findings';
    console.log(`${findings.length} documentation ${noun}.`);
  }
  return findings.length;
}
