import { vi } from 'vitest';
import type { SyncControl, SyncServices } from '../hooks/useSync';
import type { KeyStore } from '../sync/keyStore';
import type { RelayClient } from '../sync/relayClient';
import * as runner from '../sync/syncRunner';

/** A sync control on a relay and a key store. `withSync` runs the action at once. */
export const controlOf = (
  relay: RelayClient,
  keyStore: KeyStore,
  extra: Partial<SyncControl> = {}
): SyncControl & { syncNow: ReturnType<typeof vi.fn> } => {
  const services: SyncServices = { relay, keyStore, runner };
  return {
    enabled: true,
    services: () => Promise.resolve(services),
    syncNow: vi.fn(async () => ({ sent: true, skipped: false, error: null })),
    withSync: action => action(services),
    lastError: null,
    conflicts: [],
    resolveConflict: vi.fn(async () => {}),
    ...extra,
  } as SyncControl & { syncNow: ReturnType<typeof vi.fn> };
};
