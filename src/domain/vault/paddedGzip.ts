/**
 * Gzip and padding to steps of 16 KB, before an encryption. The size of the ciphertext then shows
 * only a range, not the exact number of days.
 */

const LENGTH_BYTES = 4;
const PADDING_STEP = 16384;

/** Runs the bytes through a compression or decompression stream. */
const transform = async (bytes: Uint8Array<ArrayBuffer>, stream: TransformStream) => {
  const body = new Response(bytes).body as ReadableStream<Uint8Array>;
  return new Uint8Array(await new Response(body.pipeThrough(stream)).arrayBuffer());
};

/** The length in 4 bytes, the gzip data of the text, then zero bytes to the next 16 KB. */
export async function compressAndPad(text: string): Promise<Uint8Array<ArrayBuffer>> {
  const compressed = await transform(new TextEncoder().encode(text), new CompressionStream('gzip'));
  const used = LENGTH_BYTES + compressed.length;
  const padded = new Uint8Array(Math.ceil(used / PADDING_STEP) * PADDING_STEP);
  new DataView(padded.buffer).setUint32(0, compressed.length);
  padded.set(compressed, LENGTH_BYTES);
  return padded;
}

/** The text of padded gzip bytes, or null when the length or the gzip data is not valid. */
export async function unpadAndDecompress(padded: Uint8Array<ArrayBuffer>): Promise<string | null> {
  try {
    const length = new DataView(padded.buffer, padded.byteOffset).getUint32(0);
    if (LENGTH_BYTES + length > padded.length) return null;
    const compressed = padded.slice(LENGTH_BYTES, LENGTH_BYTES + length);
    return new TextDecoder().decode(await transform(compressed, new DecompressionStream('gzip')));
  } catch {
    return null;
  }
}
