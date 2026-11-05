import { describe, expect, it } from 'vitest';
import {
  MAX_QR_VERSION,
  formatBits,
  penaltyOf,
  qrMatrix,
  reedSolomon,
  versionBits,
} from '../qrMatrix';

const INVITE =
  'https://fertility-tracker.gsuquet.com/#invite=AAAAAAAAAAAAAAAAAAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

// A decoder (OpenCV) read this code back as INVITE
const INVITE_MODULES = [
  '111111100000011110110101010111100000101111111',
  '100000100011110110110001100100011101001000001',
  '101110101011010000000001100101100101001011101',
  '101110101111101011111101101001110001101011101',
  '101110101011101110111111100000101111101011101',
  '100000101100110111001000100101000100001000001',
  '111111101010101010101010101010101010101111111',
  '000000001101011010011000100010100000100000000',
  '101111100111011101011111101000010110101111100',
  '010010000101110010100101110101101001100011111',
  '011101100010110001110110101000100110011101110',
  '010010001011010001100001100100101110111101100',
  '110110110101011101110100110000010000011001001',
  '110111001110011101000010110111100001110110100',
  '000010110000001110100111100100110111001101110',
  '011101011010110111110010000100001100100101101',
  '011010111001001001101100101001110110010000100',
  '011110000001100100100100110111110001110000100',
  '011011111100111000100111100101001101000100010',
  '001011011100011100010101111101000101000111110',
  '101111111100111001111111101001110110111110100',
  '010110001000100010101000111001101000100011101',
  '100010101110011000101010100100100101101010110',
  '111110001111101111101000100010100000100011110',
  '110011111111011110111111110000010000111111010',
  '100111000010111111111110110001101001101001101',
  '011111100000000111101100001010100010110010110',
  '000010010111001000111001100100111010000100100',
  '010011110010101011000001010000010110101010000',
  '101011010111011100001100010111110001001000100',
  '000110110011011101010100100100101011100101110',
  '111110010010000000011111000101101101101101101',
  '110111101011010100110000001000110110011100100',
  '111001001011100011101101010111100001010000100',
  '000010101110001010000100100101010101100110010',
  '011110010100101011010001100100100101101101110',
  '100110100100010001101111110001110110111110100',
  '000000001011100101101000100001101001100011111',
  '111111100001010001101010110100100101101010110',
  '100000101011100011011000100110100101100011110',
  '101110101011111011001111111100010111111111000',
  '101110101100100011110100010001101000100101011',
  '101110101111101101100000101110100011110000010',
  '100000100000000100001010100100101000000001100',
  '111111101001001010110111110000010110101100010',
];

const text = (modules: boolean[][] | null) =>
  modules?.map(row => row.map(dark => (dark ? '1' : '0')).join(''));

describe('qrMatrix', () => {
  it('gives the error correction codewords of the standard example', () => {
    // HELLO WORLD in version 1-M, alphanumeric mode
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(reedSolomon(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it('gives the format bits of level M and the version bits from the tables of the standard', () => {
    expect(formatBits(0)).toBe(0b101010000010010);
    expect(formatBits(5)).toBe(0b100000011001110);
    expect(versionBits(7)).toBe(0x07c94);
    expect(versionBits(10)).toBe(0x0a4d3);
  });

  it('makes the code of an invitation link, which a decoder reads', () => {
    expect(text(qrMatrix(INVITE))).toEqual(INVITE_MODULES);
  });

  it('uses the smallest version, and gives null above version 10', () => {
    expect(qrMatrix('a')).toHaveLength(21);
    expect(qrMatrix('x'.repeat(14))).toHaveLength(21);
    expect(qrMatrix('x'.repeat(15))).toHaveLength(25);
    expect(qrMatrix('x'.repeat(213))).toHaveLength(MAX_QR_VERSION * 4 + 17);
    expect(qrMatrix('x'.repeat(214))).toBeNull();
    // UTF-8: 2 bytes for é
    expect(qrMatrix('é'.repeat(7))).toHaveLength(21);
    expect(qrMatrix('é'.repeat(8))).toHaveLength(25);
  });

  it('has the three finder patterns', () => {
    const modules = qrMatrix(INVITE) as boolean[][];
    const size = modules.length;
    const finder = ['1111111', '1000001', '1011101', '1011101', '1011101', '1000001', '1111111'];
    for (const [x, y] of [
      [0, 0],
      [size - 7, 0],
      [0, size - 7],
    ] as const) {
      const rows = modules.slice(y, y + 7).map(row =>
        row
          .slice(x, x + 7)
          .map(dark => (dark ? '1' : '0'))
          .join('')
      );
      expect(rows).toEqual(finder);
    }
  });
});

describe('penaltyOf', () => {
  it('counts the runs, the blocks, the finder-like patterns and the balance', () => {
    const light = Array.from({ length: 11 }, () => new Array<boolean>(11).fill(false));
    // Runs of 11 in 22 lines: 22 * 9. Blocks: 100 * 3. Balance: 50 % off, 100.
    expect(penaltyOf(light)).toBe(22 * 9 + 100 * 3 + 100);
    const finderLike = [...'10111010000'].map(c => c === '1');
    const rows = Array.from({ length: 11 }, (_, y) =>
      y % 2 === 0 ? finderLike : finderLike.map(dark => !dark)
    );
    expect(penaltyOf(rows)).toBeGreaterThanOrEqual(40 * 6);
  });
});
