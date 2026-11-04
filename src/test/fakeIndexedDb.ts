/**
 * A small IndexedDB in memory for the tests of the key store. It has only the calls that the key
 * store uses: open with an upgrade, one object store, get, put and delete. `failNextOpen` and
 * `failNextRequest` make the next open or the next request fail.
 */

type Handler = ((event: Event) => void) | null;

class FakeRequest<T> {
  result: T | undefined;
  error: DOMException | null = null;
  onsuccess: Handler = null;
  onerror: Handler = null;
  onupgradeneeded: Handler = null;

  settle(run: () => T, fail: boolean) {
    queueMicrotask(() => {
      if (fail) {
        this.error = new DOMException('Fake failure', 'UnknownError');
        this.onerror?.(new Event('error'));
        return;
      }
      this.result = run();
      this.onsuccess?.(new Event('success'));
    });
  }
}

export function createFakeIndexedDb() {
  const databases = new Map<string, Map<string, Map<string, unknown>>>();
  const state = { failNextOpen: false, failNextRequest: false, closed: 0 };
  const takeFailure = (kind: 'failNextOpen' | 'failNextRequest') => {
    const fail = state[kind];
    state[kind] = false;
    return fail;
  };

  const databaseOf = (stores: Map<string, Map<string, unknown>>) => ({
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => {
      stores.set(name, new Map());
    },
    close: () => {
      state.closed += 1;
    },
    transaction: (name: string) => {
      const records = stores.get(name) as Map<string, unknown>;
      const transaction = {
        oncomplete: null as Handler,
        onerror: null as Handler,
        error: null as DOMException | null,
        objectStore: () => {
          const request = <T>(run: () => T) => {
            const req = new FakeRequest<T>();
            const fail = takeFailure('failNextRequest');
            req.settle(run, fail);
            queueMicrotask(() =>
              queueMicrotask(() => {
                if (fail) {
                  transaction.error = req.error;
                  transaction.onerror?.(new Event('error'));
                } else transaction.oncomplete?.(new Event('complete'));
              })
            );
            return req;
          };
          return {
            get: (key: string) => request(() => records.get(key)),
            put: (value: unknown, key: string) =>
              request(() => {
                records.set(key, value);
                return key;
              }),
            delete: (key: string) =>
              request(() => {
                records.delete(key);
                return undefined;
              }),
          };
        },
      };
      return transaction;
    },
  });

  const factory = {
    open: (name: string) => {
      const req = new FakeRequest<ReturnType<typeof databaseOf>>();
      const fail = takeFailure('failNextOpen');
      queueMicrotask(() => {
        if (fail) {
          req.settle(() => undefined as never, true);
          return;
        }
        let stores = databases.get(name);
        const isNew = !stores;
        if (!stores) {
          stores = new Map();
          databases.set(name, stores);
        }
        const database = databaseOf(stores);
        if (isNew) {
          req.result = database;
          req.onupgradeneeded?.(new Event('upgradeneeded'));
        }
        req.settle(() => database, false);
      });
      return req;
    },
  };
  return { factory: factory as unknown as IDBFactory, state, databases };
}
