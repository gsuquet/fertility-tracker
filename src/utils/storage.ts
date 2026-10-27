/**
 * Safe wrappers around localStorage. Storage can be missing, full or blocked
 * (private browsing, disabled cookies); every helper then fails quietly.
 */

/** Returns the stored value, or null when the key is absent or storage is unavailable. */
export const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Stores a value. Does nothing when storage is unavailable. */
export const writeStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: keep the value in memory only.
  }
};

/** Removes a value. Does nothing when storage is unavailable. */
export const removeStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing to remove.
  }
};
