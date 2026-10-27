import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkDiataxis,
  checkLinks,
  checkProse,
  headingSlugs,
  listMarkdownFiles,
  main,
  proseBlocks,
} from '../checkDocs.ts';

const messages = (findings: { message: string }[]) => findings.map(f => f.message);

describe('proseBlocks', () => {
  it('skips code blocks, tables, headings and comments', () => {
    const md = [
      '# Title',
      '',
      '```bash',
      'this is code and never prose.',
      '```',
      '',
      '| a | b |',
      '<!-- note -->',
      'A real sentence.',
    ].join('\n');
    expect(proseBlocks(md)).toEqual([{ line: 9, text: 'A real sentence.', step: false }]);
  });

  it('joins wrapped lines and marks numbered steps', () => {
    const md = ['1. Open the', '   file.', '- A list item.', '', 'One', 'paragraph.'].join('\n');
    expect(proseBlocks(md)).toEqual([
      { line: 1, text: 'Open the file.', step: true },
      { line: 3, text: 'A list item.', step: false },
      { line: 5, text: 'One paragraph.', step: false },
    ]);
  });

  it('counts inline code and links as plain words', () => {
    const [block] = proseBlocks('Run `npm run test -- --watch` from [the guide](a.md#b).');
    expect(block?.text).toBe('Run CODE from the guide.');
  });
});

describe('checkProse', () => {
  const longSentence = (words: number) =>
    `${Array.from({ length: words }, () => 'word').join(' ')}.`;

  it('accepts a descriptive sentence of 25 words', () => {
    expect(checkProse(longSentence(25))).toEqual([]);
  });

  it('rejects a descriptive sentence of more than 25 words', () => {
    expect(messages(checkProse(longSentence(26)))).toEqual([
      'Sentence has 26 words. The limit for descriptive text is 25.',
    ]);
  });

  it('rejects a procedure step of more than 20 words', () => {
    expect(messages(checkProse(`1. ${longSentence(21)}`))).toEqual([
      'Sentence has 21 words. The limit for a procedure step is 20.',
    ]);
  });

  it('rejects a paragraph of more than six sentences', () => {
    expect(messages(checkProse('One. Two. Three. Four. Five. Six. Seven.'))).toEqual([
      'Paragraph has 7 sentences. The limit is 6.',
    ]);
  });

  it('names the approved word for a word that is not approved', () => {
    expect(messages(checkProse('Utilize the drawer to ensure that it saves.'))).toEqual([
      'Do not use "utilize". Use "use".',
      'Do not use "ensure". Use "make sure".',
    ]);
  });

  it('rejects contractions', () => {
    expect(messages(checkProse("Don't close it. It's open."))).toEqual([
      'Do not use the contraction "Don\'t".',
      'Do not use the contraction "It\'s".',
    ]);
  });

  it('gives the line of the finding', () => {
    expect(checkProse('First line.\n\nPlease wait.')[0]?.line).toBe(3);
  });
});

describe('headingSlugs', () => {
  it('makes GitHub anchors from headings', () => {
    expect(headingSlugs('# Hello World\n## Step 2: Do it\n```\n# not a heading\n```')).toEqual(
      new Set(['hello-world', 'step-2-do-it'])
    );
  });
});

describe('with a docs folder', () => {
  let root: string;
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'docs-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lists README, AGENTS and every docs page', () => {
    write('README.md', '# R');
    write('AGENTS.md', '# A');
    write('docs/how-to/a.md', '# A');
    write('docs/how-to/image.png', '');
    write('src/notes.md', '# Not docs');
    expect(listMarkdownFiles(root)).toEqual(['AGENTS.md', 'README.md', 'docs/how-to/a.md']);
  });

  it('lists only the top-level files when there is no docs folder', () => {
    write('README.md', '# R');
    expect(listMarkdownFiles(root)).toEqual(['README.md']);
  });

  it('accepts links to files and headings that exist', () => {
    write('docs/reference/b.md', '# B\n## Part one');
    write('src/x.ts', '');
    const content =
      '[b](../reference/b.md#part-one) [x](../../src/x.ts) [web](https://a.b) [s](#top)\n# Top';
    expect(checkLinks('docs/how-to/a.md', content, root)).toEqual([]);
  });

  it('rejects links to missing files and missing headings', () => {
    write('docs/reference/b.md', '# B');
    const content = 'See [b](../reference/b.md#nothing).\nSee [c](c.md).';
    expect(messages(checkLinks('docs/how-to/a.md', content, root))).toEqual([
      'Link target "../reference/b.md#nothing" has no heading "nothing".',
      'Link target "c.md" does not exist.',
    ]);
  });

  it('accepts pages in the four Diátaxis folders that the index lists', () => {
    write('docs/README.md', '[a](how-to/a.md) [b](reference/b.md) [d](adr/0001-d.md)');
    write('docs/how-to/a.md', '# A\n\n1. Do it.');
    write('docs/reference/b.md', '# B');
    write('docs/adr/0001-d.md', '# D');
    expect(checkDiataxis(root)).toEqual([]);
  });

  it('rejects a page outside the four folders, a missing index entry and a guide with no steps', () => {
    write('docs/README.md', '[a](how-to/a.md)');
    write('docs/how-to/a.md', '# A\n\nNo steps here.');
    write('docs/tutorials/t.md', '# T\n\n1. Step.');
    write('docs/tutorials/u.md', '# U\n\nNo steps.');
    write('docs/notes/n.md', '# N');
    expect(checkDiataxis(root)).toEqual([
      {
        file: 'docs/how-to/a.md',
        line: 1,
        message: 'A how-to guide must have numbered steps.',
      },
      {
        file: 'docs/notes/n.md',
        line: 1,
        message:
          'Put the page in tutorials, how-to, reference or explanation. Put a decision record in adr.',
      },
      { file: 'docs/notes/n.md', line: 1, message: 'docs/README.md does not link to this page.' },
      {
        file: 'docs/tutorials/t.md',
        line: 1,
        message: 'docs/README.md does not link to this page.',
      },
      { file: 'docs/tutorials/u.md', line: 1, message: 'A tutorial must have numbered steps.' },
      {
        file: 'docs/tutorials/u.md',
        line: 1,
        message: 'docs/README.md does not link to this page.',
      },
    ]);
  });

  it('prints each finding and returns the number of findings', () => {
    write('docs/README.md', '[a](how-to/a.md)');
    write('docs/how-to/a.md', '# A\n\n1. Utilize it.');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(main(root)).toBe(1);
    expect(log).toHaveBeenCalledWith('docs/how-to/a.md:3: Do not use "utilize". Use "use".');
    expect(log).toHaveBeenLastCalledWith('1 documentation finding.');
    log.mockRestore();
  });

  it('sorts the findings by file and line', () => {
    write('docs/README.md', '[a](how-to/a.md) [b](how-to/b.md)');
    write('docs/how-to/b.md', '# B\n\n1. Utilize it.\n2. Please wait.');
    write('docs/how-to/a.md', '# A\n\n1. Ensure it.');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(main(root)).toBe(3);
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'docs/how-to/a.md:3: Do not use "ensure". Use "make sure".',
      'docs/how-to/b.md:3: Do not use "utilize". Use "use".',
      'docs/how-to/b.md:4: Do not use "please". Use "the instruction only".',
      '3 documentation findings.',
    ]);
    log.mockRestore();
  });

  it('returns zero when the docs are clean', () => {
    write('docs/README.md', '[a](how-to/a.md)');
    write('docs/how-to/a.md', '# A\n\n1. Use it.');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(main(root)).toBe(0);
    expect(log).toHaveBeenCalledWith('Documentation check passed: 2 files.');
    log.mockRestore();
  });
});
