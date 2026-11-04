import type { RelayBucket, RelayHead, RelayPutOptions } from '../relay/bucket';

interface Stored {
  value: string;
  etag: string;
  customMetadata: Record<string, string>;
}

/** A bucket in memory with the conditional writes of R2, for the tests of the relay. */
export function createMemoryBucket() {
  const objects = new Map<string, Stored>();
  let next = 0;
  // Like R2, an object without metadata has no customMetadata field
  const headOf = (stored: Stored): RelayHead =>
    Object.keys(stored.customMetadata).length > 0
      ? { etag: stored.etag, customMetadata: { ...stored.customMetadata } }
      : { etag: stored.etag };
  const bucket: RelayBucket = {
    async head(key) {
      const stored = objects.get(key);
      return stored ? headOf(stored) : null;
    },
    async get(key) {
      const stored = objects.get(key);
      return stored ? { ...headOf(stored), text: async () => stored.value } : null;
    },
    async put(key, value, options: RelayPutOptions = {}) {
      const stored = objects.get(key);
      const { etagMatches, etagDoesNotMatch } = options.onlyIf ?? {};
      if (etagMatches !== undefined && stored?.etag !== etagMatches) return null;
      if (etagDoesNotMatch === '*' && stored) return null;
      next += 1;
      const etag = `etag${next}`;
      objects.set(key, { value, etag, customMetadata: options.customMetadata ?? {} });
      return { etag };
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  return { bucket, objects };
}
