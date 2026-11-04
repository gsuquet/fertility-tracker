/** The width of a PDF page in points: the long side of an A4 sheet, as the landscape print */
export const PDF_PAGE_WIDTH = 841.89;
/** The height of a PDF page in points: the short side of an A4 sheet */
export const PDF_PAGE_HEIGHT = 595.28;

const encoder = new TextEncoder();
const round = (value: number) => Number(value.toFixed(2));

/**
 * Cuts an image of `height` pixels into pages of `pageHeight` pixels or less. A page ends only at
 * a break. A part between two breaks that is taller than a page gets its own, taller page.
 * It gives the top and the bottom of each page, in pixels.
 */
export function pageSlices(
  breaks: number[],
  height: number,
  pageHeight: number
): [number, number][] {
  const slices: [number, number][] = [];
  let top = 0;
  let last = 0;
  for (const bottom of [...breaks.filter(y => y > 0 && y < height), height]) {
    if (bottom - top > pageHeight && last > top) {
      slices.push([top, last]);
      top = last;
    }
    last = bottom;
  }
  slices.push([top, height]);
  return slices;
}

/**
 * Makes a PDF file that shows one JPEG image on landscape A4 pages, on the full width. The pages
 * end only at the `breaks` of the image, in pixels, and the image is at the top of each page.
 * A page is taller than A4 when a part of the image needs it. The file embeds the JPEG bytes as
 * they are, one time, and each page shows its part of the image.
 */
export function makeImagePdf(
  jpeg: Uint8Array,
  widthPx: number,
  heightPx: number,
  breaks: number[] = []
): Uint8Array<ArrayBuffer> {
  // The points for each pixel of the image
  const ratio = PDF_PAGE_WIDTH / widthPx;
  const width = round(PDF_PAGE_WIDTH);
  const imageHeight = round(heightPx * ratio);
  const slices = pageSlices(breaks, heightPx, PDF_PAGE_HEIGHT / ratio);
  // The catalog, the page list and the image, then a page and its content for each slice
  const pageIds = slices.map((_, index) => 4 + index * 2);
  const objects: (string | Uint8Array)[][] = [
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    [
      `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${slices.length} >>`,
    ],
    [
      `<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\n` +
        'stream\n',
      jpeg,
      '\nendstream',
    ],
  ];
  slices.forEach(([top, bottom], index) => {
    const sliceHeight = round((bottom - top) * ratio);
    const height = Math.max(sliceHeight, PDF_PAGE_HEIGHT);
    // The origin of a PDF page is at the bottom left. The clip shows only the part of the page.
    const clipY = round(height - sliceHeight);
    const imageY = round(height - imageHeight + top * ratio);
    const content =
      `q 0 ${clipY} ${width} ${sliceHeight} re W n ` +
      `${width} 0 0 ${imageHeight} 0 ${imageY} cm /Im0 Do Q`;
    objects.push(
      [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
          `/Resources << /XObject << /Im0 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
      ],
      [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]
    );
  });

  const chunks: Uint8Array[] = [];
  let length = 0;
  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };

  // The second line has bytes over 127, so that tools read the file as binary
  write('%PDF-1.4\n');
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const offsets = objects.map((parts, index) => {
    const offset = length;
    write(`${index + 1} 0 obj\n`);
    for (const part of parts) write(part);
    write('\nendobj\n');
    return offset;
  });
  const xref = length;
  // Each entry of the cross-reference table has exactly 20 bytes
  const entries = offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`);
  write(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${entries.join('')}`);
  write(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const file = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    file.set(chunk, position);
    position += chunk.length;
  }
  return file;
}
