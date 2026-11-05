/** The cause of a failed sync action, as a key of the `sync` texts. See docs/reference/screens/settings.md. */
import type { VaultError } from '../sync/deviceVault';

export type SyncFailure = 'noConnection' | 'unavailable' | 'badCode' | 'failed';

/** The cause of a failure, for an alert. The name, not instanceof: the vault code loads late. */
export const failureOf = (error: unknown, recovering = false): SyncFailure => {
  if (!(error instanceof Error) || error.name !== 'VaultError') return 'failed';
  const { reason, detail } = error as VaultError;
  if (reason === 'code') return 'badCode';
  if (reason !== 'relay') return 'failed';
  const status = detail?.status;
  if (status === 0) return 'noConnection';
  if (status === 503) return 'unavailable';
  // The relay has no lookup object for this code
  if (recovering && status === 404) return 'badCode';
  return 'failed';
};

/** True when the error tells that the device is no longer in the vault: removed, or no vault. */
export const isOutOfVault = (error: unknown): boolean => {
  if (!(error instanceof Error) || error.name !== 'VaultError') return false;
  const { reason, detail } = error as VaultError;
  return (
    reason === 'removed' ||
    (reason === 'relay' && (detail?.status === 401 || detail?.status === 404))
  );
};
