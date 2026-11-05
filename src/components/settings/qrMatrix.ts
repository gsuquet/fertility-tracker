/**
 * A QR code (ISO/IEC 18004) for the invitation link: byte mode, error correction level M,
 * versions 1 to 10. See docs/reference/screens/settings.md#qr-code.
 */

/** The blocks of each version at level M: error correction codewords, then [count, data codewords]. */
const LEVEL_M: readonly { ec: number; groups: readonly (readonly [number, number])[] }[] = [
  { ec: 10, groups: [[1, 16]] },
  { ec: 16, groups: [[1, 28]] },
  { ec: 26, groups: [[1, 44]] },
  { ec: 18, groups: [[2, 32]] },
  { ec: 24, groups: [[2, 43]] },
  { ec: 16, groups: [[4, 27]] },
  { ec: 18, groups: [[4, 31]] },
  {
    ec: 22,
    groups: [
      [2, 38],
      [2, 39],
    ],
  },
  {
    ec: 22,
    groups: [
      [3, 36],
      [2, 37],
    ],
  },
  {
    ec: 26,
    groups: [
      [4, 43],
      [1, 44],
    ],
  },
];

/** The centers of the alignment patterns on each axis, for versions 2 to 10. */
const ALIGNMENT: readonly (readonly number[])[] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

export const MAX_QR_VERSION = LEVEL_M.length;

const dataCodewords = (version: number) =>
  (LEVEL_M[version - 1] as (typeof LEVEL_M)[number]).groups.reduce(
    (sum, [count, data]) => sum + count * data,
    0
  );

/** Multiplication in GF(256) with the polynomial x^8 + x^4 + x^3 + x^2 + 1. */
const multiply = (x: number, y: number): number => {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
};

/** The generator polynomial of the Reed-Solomon code with this degree, without its first term. */
const divisorOf = (degree: number): number[] => {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = multiply(result[j] as number, root) ^ (result[j + 1] ?? 0);
    }
    root = multiply(root, 0x02);
  }
  return result;
};

/** The error correction codewords of one block. */
export const reedSolomon = (data: readonly number[], degree: number): number[] => {
  const divisor = divisorOf(degree);
  const result = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i] = (result[i] as number) ^ multiply(coefficient, factor);
    });
  }
  return result;
};

/** The data and error correction codewords of the text, interleaved, and the version. */
const codewordsOf = (bytes: Uint8Array): { version: number; codewords: number[] } | null => {
  let version = 1;
  const bitsFor = (v: number) => 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
  while (version <= MAX_QR_VERSION && bitsFor(version) > dataCodewords(version) * 8) version++;
  if (version > MAX_QR_VERSION) return null;
  const capacity = dataCodewords(version) * 8;
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) append(byte, 8);
  append(0, Math.min(4, capacity - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  for (let pad = 0xec; data.length < capacity / 8; pad ^= 0xec ^ 0x11) data.push(pad);

  const { ec, groups } = LEVEL_M[version - 1] as (typeof LEVEL_M)[number];
  const blocks: number[][] = [];
  let offset = 0;
  for (const [count, size] of groups) {
    for (let i = 0; i < count; i++) {
      blocks.push(data.slice(offset, offset + size));
      offset += size;
    }
  }
  const corrections = blocks.map(block => reedSolomon(block, ec));
  const longest = Math.max(...blocks.map(block => block.length));
  const codewords: number[] = [];
  for (let i = 0; i < longest; i++) {
    for (const block of blocks) if (i < block.length) codewords.push(block[i] as number);
  }
  for (let i = 0; i < ec; i++) {
    for (const correction of corrections) codewords.push(correction[i] as number);
  }
  return { version, codewords };
};

const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  x => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The 15 format bits of level M and a mask, with their BCH code. */
export const formatBits = (mask: number): number => {
  const data = (0b00 << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  return ((data << 10) | remainder) ^ 0x5412;
};

/** The 18 version bits of a version from 7, with their BCH code. */
export const versionBits = (version: number): number => {
  let remainder = version;
  for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  return (version << 12) | remainder;
};

/** The penalty of a matrix, as ISO/IEC 18004 gives, to choose the mask. */
export const penaltyOf = (modules: readonly (readonly boolean[])[]): number => {
  const size = modules.length;
  let penalty = 0;
  const lines = (read: (a: number, b: number) => boolean) => {
    for (let a = 0; a < size; a++) {
      let run = 1;
      let line = '';
      for (let b = 0; b < size; b++) {
        const dark = read(a, b);
        line += dark ? '1' : '0';
        if (b > 0 && dark === read(a, b - 1)) {
          run++;
        } else {
          if (run >= 5) penalty += run - 2;
          run = 1;
        }
      }
      if (run >= 5) penalty += run - 2;
      // A pattern like a finder pattern, with 4 light modules on one side
      for (const pattern of ['10111010000', '00001011101']) {
        for (let at = line.indexOf(pattern); at !== -1; at = line.indexOf(pattern, at + 1)) {
          penalty += 40;
        }
      }
    }
  };
  lines((y, x) => modules[y]?.[x] === true);
  lines((x, y) => modules[y]?.[x] === true);
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const dark = modules[y]?.[x];
      if (
        dark === modules[y]?.[x + 1] &&
        dark === modules[y + 1]?.[x] &&
        dark === modules[y + 1]?.[x + 1]
      ) {
        penalty += 3;
      }
    }
  }
  const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const total = size * size;
  penalty += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return penalty;
};

/**
 * The modules of the QR code of the text, row by row: true for a dark module. Null when the text
 * does not fit in version 10.
 */
export function qrMatrix(text: string): boolean[][] | null {
  const encoded = codewordsOf(new TextEncoder().encode(text));
  if (!encoded) return null;
  const { version, codewords } = encoded;
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    (modules[y] as boolean[])[x] = dark;
    (reserved[y] as boolean[])[x] = true;
  };

  // Timing patterns
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // Finder patterns with their separators
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, distance !== 2 && distance !== 4);
      }
    }
  }
  // Alignment patterns, except on the finder patterns
  const centers = ALIGNMENT[version - 1] as readonly number[];
  const last = centers.length - 1;
  centers.forEach((cy, i) => {
    centers.forEach((cx, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });
  // The format bits: the real values come after the choice of the mask
  const drawFormat = (mask: number) => {
    const bits = formatBits(mask);
    const bit = (i: number) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    // The dark module
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  // The codewords, two columns at a time, from the bottom right
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        if (reserved[y]?.[x] || index >= codewords.length * 8) continue;
        const byte = codewords[index >>> 3] as number;
        (modules[y] as boolean[])[x] = ((byte >>> (7 - (index & 7))) & 1) === 1;
        index++;
      }
    }
  }

  // The mask with the lowest penalty
  const masked = (mask: number) =>
    modules.map((row, y) =>
      row.map((dark, x) =>
        reserved[y]?.[x] ? dark : dark !== (MASKS[mask] as (typeof MASKS)[0])(x, y)
      )
    );
  let best: boolean[][] = [];
  let bestPenalty = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < MASKS.length; mask++) {
    drawFormat(mask);
    const candidate = masked(mask);
    const penalty = penaltyOf(candidate);
    if (penalty < bestPenalty) {
      best = candidate;
      bestPenalty = penalty;
    }
  }
  return best;
}
