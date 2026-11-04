import { describe, expect, it } from 'vitest';
import { PDF_PAGE_MIN_HEIGHT, PDF_PAGE_WIDTH, makeImagePdf } from '../pdfFile';

const JPEG = new Uint8Array([0xff, 0xd8, 0x00, 0xff, 0xd9]);
const read = (file: Uint8Array) => new TextDecoder('latin1').decode(file);

describe('makeImagePdf', () => {
  it('makes a landscape A4 page with the JPEG image at the top, on the full width', () => {
    const text = read(makeImagePdf(JPEG, 3176, 1000));
    expect(text.startsWith('%PDF-1.4\n%')).toBe(true);
    expect(text.endsWith('%%EOF\n')).toBe(true);
    expect(text).toContain(`/MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_MIN_HEIGHT}]`);
    // The image has its own ratio. The origin of the page is at the bottom.
    const height = Number(((PDF_PAGE_WIDTH * 1000) / 3176).toFixed(2));
    const top = Number((PDF_PAGE_MIN_HEIGHT - height).toFixed(2));
    expect(text).toContain(`q 841.89 0 0 ${height} 0 ${top} cm /Im0 Do Q`);
    expect(text).toContain('/Type /Pages /Kids [3 0 R] /Count 1');
    expect(text).toContain(
      '/Width 3176 /Height 1000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 5 >>'
    );
  });

  it('makes the page taller for a tall image', () => {
    const text = read(makeImagePdf(JPEG, 1000, 2000));
    expect(text).toContain('/MediaBox [0 0 841.89 1683.78]');
    expect(text).toContain('q 841.89 0 0 1683.78 0 0 cm /Im0 Do Q');
  });

  it('embeds the JPEG bytes as they are', () => {
    const file = makeImagePdf(JPEG, 10, 10);
    const start = read(file).indexOf('stream\n\xff\xd8') + 'stream\n'.length;
    expect([...file.subarray(start, start + JPEG.length)]).toEqual([...JPEG]);
  });

  it('has a cross-reference table with the byte offset of each object', () => {
    const file = makeImagePdf(JPEG, 10, 10);
    const text = read(file);
    const xref = Number(/startxref\n(\d+)\n/.exec(text)?.[1]);
    expect(text.slice(xref, xref + 5)).toBe('xref\n');
    const table = text.slice(xref).split('\n');
    expect(table[1]).toBe('0 6');
    expect(table[2]).toBe('0000000000 65535 f ');
    for (let index = 1; index <= 5; index++) {
      const entry = table[index + 2] as string;
      expect(entry).toHaveLength(19);
      expect(text.slice(Number(entry.slice(0, 10)))).toMatch(new RegExp(`^${index} 0 obj\\n`));
    }
    expect(text).toContain('trailer\n<< /Size 6 /Root 1 0 R >>');
  });

  it('gives the length of the page content', () => {
    const text = read(makeImagePdf(JPEG, 2, 1));
    const match = /<< \/Length (\d+) >>\nstream\n(.*)\nendstream/.exec(text);
    expect(match?.[2]).toHaveLength(Number(match?.[1]));
  });
});
