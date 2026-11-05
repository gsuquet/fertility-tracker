/** Removes the demo days before the device joins a vault (ADR 0012, Data that syncs). */
import { useCallback, useRef } from 'react';
import { useCycle } from '../context/CycleContext';
import { isUserObservation } from '../domain/backupReminder';

/** A function that removes the demo days. It throws when the browser refuses the write. */
export function useDemoRemoval(): () => void {
  const { observations, applySyncedObservations } = useCycle();
  const latest = useRef({ observations, applySyncedObservations });
  latest.current = { observations, applySyncedObservations };
  return useCallback(() => {
    const { observations: list, applySyncedObservations: apply } = latest.current;
    const kept = list.filter(isUserObservation);
    if (kept.length === list.length) return;
    if (!apply(kept, false)) throw new Error('The browser refused the write');
  }, []);
}
