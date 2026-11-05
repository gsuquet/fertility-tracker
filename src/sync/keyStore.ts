/** The device record of the sync in IndexedDB. See docs/reference/sync-client.md. */
import type { Member } from '../domain/vault/vaultObject';

export interface DeviceRecord {
  vaultId: string;
  memberId: string;
  role: Member['role'];
  token: string;
  /** The ECDH private key of the device. It is not extractable. */
  privateKey: CryptoKey;
  publicKey: string;
  /** The last signing public key that the device accepted. */
  trustedSigningKey: string;
  last: { counter: number; digest?: string } | null;
}

export interface KeyStore {
  load(): Promise<DeviceRecord | null>;
  save(record: DeviceRecord): Promise<void>;
  clear(): Promise<void>;
}

const DATABASE = 'fertility-tracker-sync';
const STORE = 'device';
const KEY = 'current';

const result = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const completion = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    // A failed commit, for example a full storage, fires only abort
    transaction.onabort = () =>
      reject(transaction.error ?? new DOMException('Aborted', 'AbortError'));
  });

/** The errors of a browser that has no IndexedDB or blocks it: such a browser keeps no record. */
const BLOCKED = new Set(['SecurityError', 'InvalidStateError']);

/** An error that tells that the browser cannot keep a record. */
class StorageBlocked extends Error {}

export function openKeyStore(factory: IDBFactory | undefined = globalThis.indexedDB): KeyStore {
  const open = async () => {
    let request: IDBOpenDBRequest;
    try {
      if (!factory) throw new StorageBlocked();
      request = factory.open(DATABASE, 1);
    } catch {
      throw new StorageBlocked();
    }
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    return result(request).catch((error: unknown) => {
      throw error instanceof DOMException && BLOCKED.has(error.name) ? new StorageBlocked() : error;
    });
  };
  const run = async <T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> => {
    const database = await open();
    try {
      const transaction = database.transaction(STORE, mode);
      const [value] = await Promise.all([
        result(action(transaction.objectStore(STORE))),
        completion(transaction),
      ]);
      return value;
    } finally {
      database.close();
    }
  };
  return {
    load: async () => {
      try {
        return (
          ((await run('readonly', store => store.get(KEY))) as DeviceRecord | undefined) ?? null
        );
      } catch (error) {
        if (error instanceof StorageBlocked) return null;
        throw error;
      }
    },
    save: async record => {
      await run('readwrite', store => store.put(record, KEY));
    },
    clear: async () => {
      await run('readwrite', store => store.delete(KEY));
    },
  };
}
