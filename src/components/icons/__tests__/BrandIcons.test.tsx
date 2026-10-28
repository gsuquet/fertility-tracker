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
  it('draws a decorative baby with a round head at the given size', () => {
    const { container } = render(<BabyIcon size={12} />);
    const svg = container.querySelector('svg.baby-svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '12');
    expect(svg?.querySelector('circle')).toBeInTheDocument();
  });

  it('lets the stamp CSS size the icon when no size is given', () => {
    const { container } = render(<BabyIcon />);
    expect(container.querySelector('svg.baby-svg')).not.toHaveAttribute('width');
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
    expect(svg?.querySelectorAll('path')).toHaveLength(3);
  });
});
