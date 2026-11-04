import type { VaultStore } from '../domain/sync/engine';
import { parseVaultDays, serializeVaultDays } from '../domain/sync/vaultContent';
import type { VaultDay } from '../domain/sync/vaultContent';

/**
 * A vault store in memory for the sync engine tests. It keeps the JSON text, as the relay keeps
 * the object, and gives a new ETag for each write. `changeBeforeNextWrite()` acts as a second
 * device that writes between the read and the write: the next write then gives `412`.
 */
export const createMemoryVaultStore = (initial: VaultDay[] | null = null) => {
  let text = initial ? serializeVaultDays(initial) : null;
  let version = initial ? 1 : 0;
  const others: VaultDay[][] = [];
  const store = {
    writes: 0,
    rejected: 0,
    read: async () =>
      text === null ? null : { days: parseVaultDays(JSON.parse(text)) ?? [], etag: `v${version}` },
    write: async (days: VaultDay[], etag: string | null) => {
      const other = others.shift();
      if (other) {
        text = serializeVaultDays(other);
        version += 1;
      }
      if (etag !== (text === null ? null : `v${version}`)) {
        store.rejected += 1;
        return null;
      }
      text = serializeVaultDays(days);
      version += 1;
      store.writes += 1;
      return `v${version}`;
    },
    /** A different device writes these days just before the next write. */
    changeBeforeNextWrite: (days: VaultDay[]) => {
      others.push(days);
    },
    /** The days in the vault now. */
    days: (): VaultDay[] => (text === null ? [] : (parseVaultDays(JSON.parse(text)) ?? [])),
  } satisfies VaultStore & Record<string, unknown>;
  return store;
};
