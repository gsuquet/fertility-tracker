import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseSync } from 'vite';
import { describe, it, expect } from 'vitest';

/**
 * Guard against user-visible text written directly in a component. All the text must come
 * from the locale files (`src/i18n/locales/*.ts`), so that each language shows it.
 */

/** Attributes that a browser shows or reads aloud */
const TEXT_ATTRIBUTES = new Set(['aria-label', 'aria-description', 'title', 'placeholder', 'alt']);

/**
 * Props of the app components that never hold user-visible text. Every other string prop of a
 * component (a name that starts with a capital letter) must come from the locale files.
 */
const NON_TEXT_PROPS = new Set([
  'className',
  'id',
  'key',
  'stamp',
  'size',
  'variant',
  'fill',
  'aria-hidden',
  'labelledBy',
  'describedBy',
  'panelClassName',
]);

/** Codes and symbols that are the same in each language */
const ALLOWED_TEXT = new Set([
  'P', // Peak Day code
  'I', // Intercourse code
  'v', // Version prefix, for example v1.18.3
  '10KLX3 I AP', // Example of a CrMS observation code
]);

interface AstNode {
  type: string;
  start: number;
  [key: string]: unknown;
}

const isNode = (value: unknown): value is AstNode =>
  typeof value === 'object' && value !== null && typeof (value as AstNode).type === 'string';

const hasLetter = (text: string) => /\p{L}/u.test(text);

/** The literal texts that an expression can give, for example both sides of a condition */
const literalTexts = (node: unknown): string[] => {
  if (!isNode(node)) return [];
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? [node.value] : [];
    case 'TemplateLiteral':
      return (node.quasis as { value: { cooked: string } }[]).map(q => q.value.cooked);
    case 'ParenthesizedExpression':
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
      return literalTexts(node.expression);
    case 'ArrayExpression':
      return (node.elements as unknown[]).flatMap(literalTexts);
    case 'ConditionalExpression':
      return [...literalTexts(node.consequent), ...literalTexts(node.alternate)];
    case 'LogicalExpression':
      return [...literalTexts(node.left), ...literalTexts(node.right)];
    case 'BinaryExpression':
      // Only a concatenation gives text. A comparison such as tab === 'today' does not.
      return node.operator === '+' ? [...literalTexts(node.left), ...literalTexts(node.right)] : [];
    default:
      return [];
  }
};

interface Finding {
  line: number;
  kind: string;
  text: string;
}

/** True for the opening tag of a component, for example <ChartToolbar>, not of an HTML element */
const isComponent = (node: AstNode | null) =>
  node?.type === 'JSXOpeningElement' &&
  isNode(node.name) &&
  (node.name.type === 'JSXMemberExpression' || /^[A-Z]/.test(String(node.name.name)));

/** Finds the hardcoded user-visible texts of one TSX source */
const findHardcodedText = (fileName: string, source: string): Finding[] => {
  const { program, errors } = parseSync(fileName, source);
  if (errors.length > 0) throw new Error(`Cannot parse ${fileName}`);
  const findings: Finding[] = [];
  const add = (node: AstNode, kind: string, text: string) => {
    const trimmed = text.trim();
    if (hasLetter(trimmed) && !ALLOWED_TEXT.has(trimmed)) {
      findings.push({ line: source.slice(0, node.start).split('\n').length, kind, text: trimmed });
    }
  };

  const visit = (node: AstNode, parent: AstNode | null) => {
    if (node.type === 'JSXText') add(node, 'JSX text', String(node.value));
    if (node.type === 'JSXExpressionContainer' && parent?.type !== 'JSXAttribute') {
      for (const text of literalTexts(node.expression)) add(node, 'JSX expression', text);
    }
    if (node.type === 'JSXAttribute' && isNode(node.name)) {
      const name = String(node.name.name);
      if (TEXT_ATTRIBUTES.has(name) || (isComponent(parent) && !NON_TEXT_PROPS.has(name))) {
        const value = node.value;
        const texts =
          isNode(value) && value.type === 'JSXExpressionContainer'
            ? literalTexts(value.expression)
            : literalTexts(value);
        for (const text of texts) add(node, name, text);
      }
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) {
        for (const item of child) if (isNode(item)) visit(item, node);
      } else if (isNode(child)) {
        visit(child, node);
      }
    }
  };

  visit(program as unknown as AstNode, null);
  return findings;
};

const SRC = join(process.cwd(), 'src');

const componentFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || path === join(SRC, 'test') ? [] : componentFiles(path);
    }
    return entry.name.endsWith('.tsx') ? [path] : [];
  });

describe('No hardcoded user-visible text', () => {
  it('finds JSX text, literal expressions and literal text attributes', () => {
    const source = [
      'export const A = ({ on }: { on: boolean }) => (',
      '  <div title="Hello" aria-label={on ? "Open" : "Closed"}>',
      '    Some text',
      `    {\`Day \${1}\`}`,
      '    {"Total: " + 2}',
      '    {on ? (on ? " (Yes)" : " (No)") : ""}',
      '    <Toolbar subtitle="Creighton Model" messages={["Hello"]} className="x-y" size="sm" />',
      '    <input placeholder={"Type here"} alt="Picture" />',
      '  </div>',
      ');',
    ].join('\n');
    expect(findHardcodedText('a.tsx', source).map(f => `${f.kind}: ${f.text}`)).toEqual([
      'title: Hello',
      'aria-label: Open',
      'aria-label: Closed',
      'JSX text: Some text',
      'JSX expression: Day',
      'JSX expression: Total:',
      'JSX expression: (Yes)',
      'JSX expression: (No)',
      'subtitle: Creighton Model',
      'messages: Hello',
      'placeholder: Type here',
      'alt: Picture',
    ]);
  });

  it('accepts translated text, symbols, numbers and allowed codes', () => {
    const source = [
      'export const A = ({ t, n }: { t: { a: string }; n: number }) => (',
      `  <div title={t.a} aria-label={\`\${t.a} \${n}\`} className="not-text">`,
      '    {t.a} → {n} · 1,2,3 {"---"} {n === 1 && t.a}',
      '    <span>P</span> <span>I</span> v{n} <code>10KLX3 I AP</code>',
      '  </div>',
      ');',
    ].join('\n');
    expect(findHardcodedText('a.tsx', source)).toEqual([]);
  });

  it('fails on a source that does not parse', () => {
    expect(() => findHardcodedText('a.tsx', 'const = <div')).toThrow('Cannot parse a.tsx');
  });

  it('has no hardcoded text in the components', () => {
    const findings = componentFiles(SRC).flatMap(file =>
      findHardcodedText(file, readFileSync(file, 'utf8')).map(
        f => `${relative(process.cwd(), file)}:${f.line} ${f.kind}: ${JSON.stringify(f.text)}`
      )
    );
    expect(findings).toEqual([]);
  });
});
