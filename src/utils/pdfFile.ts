/** The width of the PDF page in points: the long side of an A4 sheet, as the landscape print */
export const PDF_PAGE_WIDTH = 841.89;
/** The least height of the PDF page in points: the short side of an A4 sheet */
export const PDF_PAGE_MIN_HEIGHT = 595.28;

const encoder = new TextEncoder();
const round = (value: number) => Number(value.toFixed(2));

/**
 * Makes a PDF file of one page that shows one JPEG image at the top, on the full width. The page
 * is a landscape A4 sheet, or taller when the image needs it. The PDF embeds the JPEG bytes as
 * they are.
 */
export function makeImagePdf(
  jpeg: Uint8Array,
  widthPx: number,
  heightPx: number
): Uint8Array<ArrayBuffer> {
  const width = round(PDF_PAGE_WIDTH);
  const imageHeight = round((PDF_PAGE_WIDTH * heightPx) / widthPx);
  const height = Math.max(imageHeight, PDF_PAGE_MIN_HEIGHT);
  // The origin of a PDF page is at the bottom left
  const top = round(height - imageHeight);
  const content = `q ${width} 0 0 ${imageHeight} 0 ${top} cm /Im0 Do Q`;
  const objects: (string | Uint8Array)[][] = [
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>'],
    [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
        '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>',
    ],
    [
      `<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\n` +
        'stream\n',
      jpeg,
      '\nendstream',
    ],
    [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
  ];

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
