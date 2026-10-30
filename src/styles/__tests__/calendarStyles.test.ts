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

  // The phone rules are the base rules, and no width cuts the code or fixes the height
  it('lets the observation code wrap instead of cutting it', () => {
    for (const code of declarationsOf(calendar, '.calendar-code')) {
      expect(code).not.toMatch(/white-space:\s*nowrap/);
      expect(code).not.toMatch(/text-overflow:\s*ellipsis/);
    }
    const [base] = declarationsOf(calendar, '.calendar-code');
    expect(base).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('mutes a day of the month before or after, but keeps its text readable', () => {
    const [cell] = declarationsOf(calendar, '.calendar-day.outside-month');
    expect(cell).toMatch(/background:\s*none/);
    const [text] = declarationsOf(
      calendar,
      '.calendar-day.outside-month :is(.calendar-day-num, .calendar-code)'
    );
    expect(text).toMatch(/(^|\s)color:\s*var\(--text-muted\)/);
    const [stamp] = declarationsOf(calendar, '.calendar-day.outside-month .stamp-badge-container');
    expect(stamp).toMatch(/opacity:\s*0\.5/);
  });

  it('lets a day cell grow to fit its content, from 80 px on a phone', () => {
    for (const cell of declarationsOf(calendar, '.calendar-day')) {
      expect(cell).not.toMatch(/(^|\s)height:\s*\d/);
    }
    const [base] = declarationsOf(calendar, '.calendar-day');
    expect(base).toMatch(/min-height:\s*80px/);
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
