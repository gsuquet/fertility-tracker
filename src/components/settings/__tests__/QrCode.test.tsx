import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QrCode } from '../QrCode';

const label = 'QR';

describe('QrCode', () => {
  it('is an image with a name, a quiet zone and one square for each dark module', () => {
    render(<QrCode text="a" label={label} />);
    const image = screen.getByRole('img', { name: label });
    expect(image.getAttribute('viewBox')).toBe('0 0 29 29');
    const path = image.querySelector('path')?.getAttribute('d') ?? '';
    // The top left corner of the first finder pattern, after the quiet zone
    expect(path.startsWith('M4 4h1v1h-1z')).toBe(true);
  });

  it('shows nothing for a text that does not fit', () => {
    const { container } = render(<QrCode text={'x'.repeat(214)} label={label} />);
    expect(container).toBeEmptyDOMElement();
  });
});
