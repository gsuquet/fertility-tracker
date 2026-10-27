import { LAST_SEEN_VERSION_KEY } from '../utils/storageKeys';

// The main chunk imports this module. Do not import `versionTracker.ts` here:
// its release notes must stay in the lazy chunk of the About dialog.

/** App version, injected from package.json by Vite (`define` in vite.config.ts). */
export function getAppVersion(): string {
  return __APP_VERSION__;
}

/** Build timestamp, injected by Vite (`define` in vite.config.ts). */
export function getBuildDate(): string {
  return __BUILD_DATE__;
}

export function checkAndRecordVersionSeen(): {
  isNewVersion: boolean;
  previousVersion: string | null;
} {
  try {
    const currentVersion = getAppVersion();
    const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    const isNewVersion = !lastSeen || lastSeen !== currentVersion;

    if (isNewVersion) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
    }

    return {
      isNewVersion,
      previousVersion: lastSeen,
    };
  } catch {
    return {
      isNewVersion: false,
      previousVersion: null,
    };
  }
}
