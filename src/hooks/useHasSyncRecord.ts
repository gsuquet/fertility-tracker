/** Whether the device has a sync record. See docs/reference/screens/welcome-guide.md. */
import { useEffect, useState } from 'react';
import type { SyncControl } from './useSync';

/**
 * True when the key store has a device record, false when it has none or the sync is off. Null
 * while the key store loads, and after a failed load.
 */
export function useHasSyncRecord(control: SyncControl | undefined): boolean | null {
  const enabled = control?.enabled === true;
  const services = control?.services;
  const [hasRecord, setHasRecord] = useState<boolean | null>(enabled ? null : false);
  useEffect(() => {
    if (!enabled || !services) return;
    let live = true;
    services()
      .then(({ keyStore }) => keyStore.load())
      .then(
        record => {
          if (live) setHasRecord(record !== null);
        },
        () => {}
      );
    return () => {
      live = false;
    };
  }, [enabled, services]);
  return hasRecord;
}
