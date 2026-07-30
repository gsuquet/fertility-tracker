import { groupObservationsIntoCycles } from './cycleBoundaryDetector';
import { Observation } from '../types/crms';

export interface VersionRelease {
  version: string;
  date: string;
  title: string;
  tagline?: string;
  highlights: string[];
  crmsSpecVersion: string;
  breakingChanges?: boolean;
}

export interface VersionInfo {
  version: string;
  buildDate: string;
  crmsSpecVersion: string;
  appName: string;
  environment: string;
  repositoryUrl: string;
}

export interface StorageStats {
  itemCount: number;
  estimatedBytes: number;
  formattedSize: string;
  cyclesCount: number;
  observationsCount: number;
}

export const LAST_SEEN_VERSION_KEY = 'fertility_tracker_last_seen_version';
export const STORAGE_OBSERVATIONS_KEY = 'fertility_care_observations';
export const CRMS_SPEC_VERSION = '1.0.0';

export const VERSION_HISTORY: VersionRelease[] = [
  {
    version: '1.1.0',
    date: '2026-07-30',
    title: 'Version Tracker & Application UX Performance Suite',
    tagline: 'Built-in Version Tracker, UX performance enhancements, and mobile top bar scaling',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Added interactive Version Tracker & System Diagnostics modal accessible from header & footer',
      'UX performance optimizations for high-speed chart rendering and instant view transitions',
      'Responsive mobile top bar layout with adaptive brand logo scaling and tight button spacing',
      'Enhanced surface token color contrast across dark and light UI design modes',
      'Live storage footprint diagnostics tracking logged observations and active cycles',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-29',
    title: 'Creighton Model System Core Engine & Multi-View Suite',
    tagline: 'Initial official release of Fertility Tracker',
    crmsSpecVersion: '1.0.0',
    highlights: [
      'Standardized Creighton Model System (CrMS) biomarker parser and stamp calculator',
      'Automatic Peak Day (P) detection and post-peak transition counting (P+1, P+2, P+3)',
      'Paper Chart Strip view, Monthly Calendar Grid, Today Observation view, and Cycle Analytics',
      'Practitioner PDF export, high-resolution PNG chart rendering, and JSON data backup/restore',
      'Bilingual support (English and French) with light and dark mode design themes',
      'Privacy-first architecture with 100% local client-side data storage',
    ],
  },
];

export function getAppVersion(): string {
  if (typeof __APP_VERSION__ !== 'undefined') {
    return __APP_VERSION__;
  }
  return '1.1.0';
}

export function getBuildDate(): string {
  if (typeof __BUILD_DATE__ !== 'undefined') {
    return __BUILD_DATE__;
  }
  return '2026-07-30T00:00:00.000Z';
}

export function getVersionInfo(): VersionInfo {
  return {
    version: getAppVersion(),
    buildDate: getBuildDate(),
    crmsSpecVersion: CRMS_SPEC_VERSION,
    appName: 'Fertility Tracker',
    environment: import.meta.env?.MODE || 'production',
    repositoryUrl: 'https://github.com/gsuquet/fertility-tracker',
  };
}

export function getVersionHistory(): VersionRelease[] {
  return VERSION_HISTORY;
}

export function getLatestRelease(): VersionRelease {
  return VERSION_HISTORY[0];
}

export function checkAndRecordVersionSeen(): { isNewVersion: boolean; previousVersion: string | null } {
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

export function getStorageStats(): StorageStats {
  let itemCount = 0;
  let totalBytes = 0;
  let cyclesCount = 0;
  let observationsCount = 0;

  try {
    if (typeof localStorage !== 'undefined') {
      const knownKeys = [
        STORAGE_OBSERVATIONS_KEY,
        LAST_SEEN_VERSION_KEY,
        'fertility_care_lang',
        'fertility_care_theme',
      ];
      const keysSet = new Set<string>(knownKeys);
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) keysSet.add(k);
        }
        for (const k of Object.keys(localStorage)) {
          if (typeof (localStorage as unknown as Record<string, unknown>)[k] === 'string') {
            keysSet.add(k);
          }
        }
      } catch {
        // ignore
      }

      for (const key of keysSet) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          itemCount++;
          totalBytes += key.length + val.length;
        }
      }

      const storedObs = localStorage.getItem(STORAGE_OBSERVATIONS_KEY);
      if (storedObs) {
        const parsed = JSON.parse(storedObs);
        if (Array.isArray(parsed)) {
          observationsCount = parsed.length;
          const cycles = groupObservationsIntoCycles(parsed as Observation[]);
          cyclesCount = cycles.length;
        }
      }
    }
  } catch {
    // Graceful fallback if localStorage is unavailable
  }

  let formattedSize = `${totalBytes} B`;
  if (totalBytes > 1024 * 1024) {
    formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (totalBytes > 1024) {
    formattedSize = `${(totalBytes / 1024).toFixed(2)} KB`;
  }

  return {
    itemCount,
    estimatedBytes: totalBytes,
    formattedSize,
    cyclesCount,
    observationsCount,
  };
}
