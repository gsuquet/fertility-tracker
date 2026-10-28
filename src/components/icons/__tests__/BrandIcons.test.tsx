import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BabyIcon } from '../BabyIcon';
import { BrandMark } from '../BrandMark';

const componentsDir = join(__dirname, '..', '..');

const tsxFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });

describe('BabyIcon', () => {
  it('draws a decorative baby with a round head and leaves its size to the CSS', () => {
    const { container } = render(<BabyIcon />);
    const svg = container.querySelector('svg.baby-svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('width');
    expect(svg?.querySelector('circle')).toBeInTheDocument();
  });

  it('is the only baby drawing in the components', () => {
    const owners = tsxFiles(componentsDir).filter(path =>
      readFileSync(path, 'utf8').includes('className="baby-svg"')
    );
    expect(owners.map(path => path.slice(componentsDir.length + 1))).toEqual([
      join('icons', 'BabyIcon.tsx'),
    ]);
  });
});

describe('BrandMark', () => {
  it('draws the decorative sprout logo on its tile', () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector('svg.brand-mark');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.querySelector('rect')).toHaveClass('brand-mark-tile');
    // Fallback colors of the same drawing as public/icons/logo.svg, for use outside the header
    expect(svg?.querySelector('rect')).toHaveAttribute('fill', '#1f3a5f');
    expect(svg?.querySelectorAll('path')).toHaveLength(3);
  });
});
