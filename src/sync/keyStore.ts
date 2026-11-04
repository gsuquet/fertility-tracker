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
  });

export function openKeyStore(factory: IDBFactory = globalThis.indexedDB): KeyStore {
  const run = async <T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> => {
    const request = factory.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    const database = await result(request);
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
    load: async () =>
      ((await run('readonly', store => store.get(KEY))) as DeviceRecord | undefined) ?? null,
    save: async record => {
      await run('readwrite', store => store.put(record, KEY));
    },
    clear: async () => {
      await run('readwrite', store => store.delete(KEY));
    },
  };
}
