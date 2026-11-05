/** The cause of a failed sync action, as a key of the `sync` texts. See docs/reference/screens/settings.md. */
import type { SyncControl } from '../hooks/useSync';
import type { VaultError } from '../sync/deviceVault';

export type SyncFailure =
  | 'noConnection'
  | 'unavailable'
  | 'wrongHost'
  | 'busy'
  | 'badCode'
  | 'signIn'
  | 'failed';

/** The cause of a failure, for an alert. The name, not instanceof: the vault code loads late. */
export const failureOf = (error: unknown, recovering = false): SyncFailure => {
  if (!(error instanceof Error) || error.name !== 'VaultError') return 'failed';
  const { reason, detail } = error as VaultError;
  if (reason === 'code') return 'badCode';
  if (reason !== 'relay') return 'failed';
  const status = detail?.status;
  if (status === 0) return 'noConnection';
  // Cloudflare Access asks for a new sign-in: the relay client does not follow its redirect
  if (status === 302 && detail?.error === 'signIn') return 'signIn';
  if (status === 503) return 'unavailable';
  if (status === 403 && detail?.error === 'host') return 'wrongHost';
  if (status === 429) return 'busy';
  // The relay has no lookup object for this code
  if (recovering && status === 404) return 'badCode';
  return 'failed';
};

/**
 * A short code of the error for the user to report: the status and the error of the relay, the
 * reason of a vault error, or the name of another error.
 */
export const failureCodeOf = (error: unknown): string | null => {
  if (!(error instanceof Error)) return null;
  if (error.name !== 'VaultError') return error.name;
  const { reason, detail } = error as VaultError;
  if (reason !== 'relay') return reason;
  return [detail?.status, detail?.error].filter(part => part !== undefined).join(' ');
};

/** The name of the error of a browser that blocks the storage of the device record. */
export const STORAGE_BLOCKED = 'StorageBlocked';

/** True when the browser has no IndexedDB or blocks it: such a browser keeps no device record. */
export const isStorageBlocked = (error: unknown): boolean =>
  error instanceof Error && error.name === STORAGE_BLOCKED;

/** True when the error tells that the device is no longer in the vault: removed, or no vault. */
export const isOutOfVault = (error: unknown): boolean => {
  if (!(error instanceof Error) || error.name !== 'VaultError') return false;
  const { reason, detail } = error as VaultError;
  return (
    reason === 'removed' ||
    (reason === 'relay' && (detail?.status === 401 || detail?.status === 404))
  );
};

/** The gear shows the sync warning after this number of failed syncs in a row. */
export const WARNING_FAILURES = 2;
/** The gear shows the sync warning when the last sync is older than this. */
export const WARNING_AGE_MS = 24 * 60 * 60 * 1000;

/** True when the last sync occurred more than one day ago. False without the time of a sync. */
export const isStale = (lastSyncedAt: number | null, now: number): boolean =>
  lastSyncedAt !== null && now - lastSyncedAt > WARNING_AGE_MS;

/** True when the sync needs the user. See docs/reference/screens/navigation.md#sync-warning. */
export const needsAttention = (
  control: Pick<SyncControl, 'hasRecord' | 'lastError' | 'failures' | 'lastSyncedAt'>,
  now: number
): boolean => {
  const { hasRecord, lastError, failures, lastSyncedAt } = control;
  if (hasRecord !== true) return false;
  if (lastError && failureOf(lastError) === 'signIn') return true;
  if (failures >= WARNING_FAILURES) return true;
  return isStale(lastSyncedAt, now);
};
