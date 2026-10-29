import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = join(__dirname, '..');
const readCss = (file: string) => readFileSync(join(stylesDir, file), 'utf8');

// Returns the declarations of every rule whose selector list is exactly `selector`
const declarationsOf = (css: string, selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'g');
  return [...css.matchAll(pattern)].map(match => match[1] ?? '');
};

const mobileBlock = (css: string) => {
  const start = css.indexOf('@media (max-width: 640px)');
  expect(start).toBeGreaterThan(-1);
  return css.slice(start);
};

describe('calendar styles', () => {
  const calendar = readCss('views/calendar.css');

  it.each(['.calendar-month-title', '.calendar-day', '.calendar-code'])(
    'gives %s an explicit theme text color',
    selector => {
      const [base] = declarationsOf(calendar, selector);
      expect(base).toMatch(/(^|\s)color:\s*var\(--text-(primary|secondary)\)/);
    }
  );

  it('lets the observation code wrap on mobile instead of cutting it', () => {
    const [mobileCode] = declarationsOf(mobileBlock(calendar), '.calendar-code');
    expect(mobileCode).not.toMatch(/white-space:\s*nowrap/);
    expect(mobileCode).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(mobileCode).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('lets a mobile day cell grow to fit its content', () => {
    const [mobileDay] = declarationsOf(mobileBlock(calendar), '.calendar-day');
    expect(mobileDay).not.toMatch(/(^|\s)height:\s*\d/);
    expect(mobileDay).toMatch(/min-height:/);
  });
});

describe('theme tokens', () => {
  const tokens = readCss('tokens/tokens.css');

  it('tells the browser which color scheme each theme uses', () => {
    const [light] = declarationsOf(tokens, ':root');
    const [dark] = declarationsOf(tokens, "[data-theme='dark']");
    expect(light).toMatch(/color-scheme:\s*light/);
    expect(dark).toMatch(/color-scheme:\s*dark/);
  });
});

describe('observation drawer styles', () => {
  const drawer = readCss('views/drawer.css');

  it('keeps all footer buttons on screen on mobile', () => {
    const mobile = mobileBlock(drawer);
    const [footerButton] = declarationsOf(mobile, '.drawer-footer .btn');
    expect(footerButton).toMatch(/flex-shrink:\s*1/);
    expect(footerButton).toMatch(/min-width:\s*0/);
    // The two buttons are 48 px high at each width
    const [base] = declarationsOf(drawer, '.drawer-footer .btn');
    expect(base).toMatch(/min-height:\s*var\(--row-height\)/);
  });
});
