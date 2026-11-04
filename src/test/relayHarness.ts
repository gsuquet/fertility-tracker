import { DEFAULT_RELAY_HOST, handleRelay } from '../relay/handler';
import type { RelayEnv } from '../relay/handler';
import type { DeviceRecord, KeyStore } from '../sync/keyStore';
import { createRelayClient } from '../sync/relayClient';
import type { Fetcher } from '../sync/relayClient';
import { createMemoryBucket } from './memoryBucket';

/** A relay client on the real relay handler and a bucket in memory. */
export function createRelayHarness() {
  const { bucket, objects } = createMemoryBucket();
  const env: RelayEnv = { VAULTS: bucket };
  let fail: ((request: Request) => boolean) | null = null;
  const fetcher: Fetcher = async request => {
    if (fail?.(request)) throw new TypeError('Failed to fetch');
    return handleRelay(request, env);
  };
  const relay = createRelayClient(fetcher, `https://${DEFAULT_RELAY_HOST}`);
  return {
    bucket,
    objects,
    env,
    relay,
    fetcher,
    /** The network fails for each request that the function selects. */
    failWhen: (select: ((request: Request) => boolean) | null) => {
      fail = select;
    },
  };
}

/** A key store in memory. */
export function createMemoryKeyStore(initial: DeviceRecord | null = null) {
  let record = initial;
  const store = {
    saves: 0,
    load: async () => record,
    save: async (next: DeviceRecord) => {
      record = next;
      store.saves += 1;
    },
    clear: async () => {
      record = null;
    },
  } satisfies KeyStore & Record<string, unknown>;
  return store;
}
