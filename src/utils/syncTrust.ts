/**
 * The trust of the sync state. A version without the sync writes the observations without their
 * mark. Its list can lack days of the vault, so the sync state must go: the next sync is then a
 * first sync, and the vault wins on each date. See docs/reference/data-storage.md.
 */
import { readStorage, removeStorage } from './storage';
import { STORAGE_OBSERVATIONS_MARK_KEY, STORAGE_SYNC_STATE_KEY } from './storageKeys';
import { markOf } from './textMark';

let distrusted = 0;

/** Deletes the sync state when `text`, the stored observations, does not have its mark. */
export function checkStoredMark(text: string | null): void {
  if (text === null || readStorage(STORAGE_OBSERVATIONS_MARK_KEY) === markOf(text)) return;
  removeStorage(STORAGE_SYNC_STATE_KEY);
  distrusted += 1;
}

/** The number of times this page deleted the sync state for a list without its mark. */
export const distrustCount = (): number => distrusted;
