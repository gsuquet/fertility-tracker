import { describe, expect, it } from 'vitest';
import { PDF_PAGE_HEIGHT, PDF_PAGE_WIDTH, makeImagePdf, pageSlices } from '../pdfFile';

const JPEG = new Uint8Array([0xff, 0xd8, 0x00, 0xff, 0xd9]);
const read = (file: Uint8Array) => new TextDecoder('latin1').decode(file);
const round = (value: number) => Number(value.toFixed(2));

describe('pageSlices', () => {
  it('keeps a short image on one page', () => {
    expect(pageSlices([100, 200], 300, 1000)).toEqual([[0, 300]]);
  });

  it('ends each page at the last break that fits', () => {
    expect(pageSlices([400, 800, 1200, 1600], 2700, 1000)).toEqual([
      [0, 800],
      [800, 1600],
      [1600, 2700],
    ]);
    expect(pageSlices([400, 800, 1200, 1600], 1700, 1000)).toEqual([
      [0, 800],
      [800, 1700],
    ]);
  });

  it('gives a part taller than a page its own page', () => {
    expect(pageSlices([300, 1800], 2000, 1000)).toEqual([
      [0, 300],
      [300, 1800],
      [1800, 2000],
    ]);
    expect(pageSlices([], 2500, 1000)).toEqual([[0, 2500]]);
  });

  it('ignores the breaks at the edges of the image', () => {
    expect(pageSlices([0, 1500, 2000], 1500, 1000)).toEqual([[0, 1500]]);
  });
});

describe('makeImagePdf', () => {
  it('makes a landscape A4 page with the JPEG image at the top, on the full width', () => {
    const text = read(makeImagePdf(JPEG, 3176, 1000));
    expect(text.startsWith('%PDF-1.4\n%')).toBe(true);
    expect(text.endsWith('%%EOF\n')).toBe(true);
    expect(text).toContain(`/MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}]`);
    // The origin of the page is at the bottom
    const height = round((PDF_PAGE_WIDTH * 1000) / 3176);
    const top = round(PDF_PAGE_HEIGHT - height);
    expect(text).toContain(
      `q 0 ${top} 841.89 ${height} re W n 841.89 0 0 ${height} 0 ${top} cm /Im0 Do Q`
    );
    expect(text).toContain('/Type /Pages /Kids [4 0 R] /Count 1');
    expect(text).toContain(
      '/Width 3176 /Height 1000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 5 >>'
    );
  });

  it('shows each part of a long image at the top of its own page', () => {
    // 1000 pixels are 841.89 points: an A4 page holds 707 pixels
    const text = read(makeImagePdf(JPEG, 1000, 1200, [500, 900]));
    expect(text).toContain('/Type /Pages /Kids [4 0 R 6 0 R] /Count 2');
    // The image is embedded one time
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(1);
    // Page 1: rows 0 to 500. Page 2: rows 500 to 1200, with the image moved up by 500 rows.
    expect(text).toContain('q 0 174.34 841.89 420.94 re W n 841.89 0 0 1010.27 0 -414.99 cm');
    expect(text).toContain('q 0 5.96 841.89 589.32 re W n 841.89 0 0 1010.27 0 5.95 cm');
    expect(text).toContain('/Contents 5 0 R');
    expect(text).toContain('/Contents 7 0 R');
  });

  it('makes a page taller for a part that is taller than A4', () => {
    const text = read(makeImagePdf(JPEG, 1000, 2000));
    expect(text).toContain('/MediaBox [0 0 841.89 1683.78]');
    expect(text).toContain('q 0 0 841.89 1683.78 re W n 841.89 0 0 1683.78 0 0 cm /Im0 Do Q');
  });

  it('embeds the JPEG bytes as they are', () => {
    const file = makeImagePdf(JPEG, 10, 10);
    const start = read(file).indexOf('stream\n\xff\xd8') + 'stream\n'.length;
    expect([...file.subarray(start, start + JPEG.length)]).toEqual([...JPEG]);
  });

  it('has a cross-reference table with the byte offset of each object', () => {
    const file = makeImagePdf(JPEG, 1000, 1200, [500, 900]);
    const text = read(file);
    const xref = Number(/startxref\n(\d+)\n/.exec(text)?.[1]);
    expect(text.slice(xref, xref + 5)).toBe('xref\n');
    const table = text.slice(xref).split('\n');
    expect(table[1]).toBe('0 8');
    expect(table[2]).toBe('0000000000 65535 f ');
    for (let index = 1; index <= 7; index++) {
      const entry = table[index + 2] as string;
      expect(entry).toHaveLength(19);
      expect(text.slice(Number(entry.slice(0, 10)))).toMatch(new RegExp(`^${index} 0 obj\\n`));
    }
    expect(text).toContain('trailer\n<< /Size 8 /Root 1 0 R >>');
  });

  it('gives the length of each page content', () => {
    const text = read(makeImagePdf(JPEG, 1000, 1200, [500, 900]));
    const contents = [...text.matchAll(/<< \/Length (\d+) >>\nstream\n(.*)\nendstream/g)];
    expect(contents).toHaveLength(2);
    for (const match of contents) expect(match[2]).toHaveLength(Number(match[1]));
  });
});
