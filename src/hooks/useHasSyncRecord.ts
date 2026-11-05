/** Whether the device has a sync record. See docs/reference/screens/welcome-guide.md. */
import { useEffect, useState } from 'react';
import type { SyncControl } from './useSync';

/**
 * True when the key store has a device record, false when it has none. Null
 * while the key store loads, and after a failed load.
 */
export function useHasSyncRecord(control: SyncControl | undefined): boolean | null {
  const services = control?.services;
  const [hasRecord, setHasRecord] = useState<boolean | null>(services ? null : false);
  useEffect(() => {
    if (!services) return;
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
  }, [services]);
  return hasRecord;
}
