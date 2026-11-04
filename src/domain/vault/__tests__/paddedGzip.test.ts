import { describe, expect, it } from 'vitest';
import { compressAndPad, unpadAndDecompress } from '../paddedGzip';

describe('paddedGzip', () => {
  it('pads to steps of 16 KB and gives the text back', async () => {
    const padded = await compressAndPad('[]');
    expect(padded).toHaveLength(16384);
    expect(await unpadAndDecompress(padded)).toBe('[]');
  });

  it('gives null for a wrong length or data that is not gzip', async () => {
    const tooLong = new Uint8Array(16384);
    new DataView(tooLong.buffer).setUint32(0, 20000);
    expect(await unpadAndDecompress(tooLong)).toBeNull();
    const notGzip = new Uint8Array(16384);
    new DataView(notGzip.buffer).setUint32(0, 4);
    notGzip.fill(9, 4, 8);
    expect(await unpadAndDecompress(notGzip)).toBeNull();
    expect(await unpadAndDecompress(new Uint8Array(2))).toBeNull();
  });
});
