import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import pkg from '../../../package.json';
import {
  getAppVersion,
  getBuildDate,
  getVersionInfo,
  getVersionHistory,
  getLatestRelease,
  checkAndRecordVersionSeen,
  getStorageStats,
  CRMS_SPEC_VERSION,
} from '../versionTracker';
import { LAST_SEEN_VERSION_KEY, STORAGE_OBSERVATIONS_KEY } from '../../utils/storageKeys';

describe('versionTracker Domain Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns valid app version info', () => {
    const info = getVersionInfo();
    expect(info.appName).toBe('Fertility Tracker');
    expect(info.crmsSpecVersion).toBe(CRMS_SPEC_VERSION);
    expect(typeof info.version).toBe('string');
    expect(typeof info.buildDate).toBe('string');
    expect(info.repositoryUrl).toContain('github.com');
  });

  it('returns non-empty version history and latest release', () => {
    const history = getVersionHistory();
    const latest = getLatestRelease();

    expect(history.length).toBeGreaterThan(1);
    expect(latest.version).toBe(pkg.version);
    expect(latest.highlights.length).toBeGreaterThan(0);
    expect(latest.crmsSpecVersion).toBe('1.1.0');
  });

  it('correctly tracks and updates last seen version in localStorage', () => {
    // First run (no version stored)
    const check1 = checkAndRecordVersionSeen();
    expect(check1.isNewVersion).toBe(true);
    expect(check1.previousVersion).toBeNull();
    expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe(pkg.version);

    // Second run (same version stored)
    const check2 = checkAndRecordVersionSeen();
    expect(check2.isNewVersion).toBe(false);
    expect(check2.previousVersion).toBe(pkg.version);
  });

  it('calculates storage stats from localStorage', () => {
    const mockObs = [
      { id: 'obs-1', date: '2026-07-01', code: 'H', stamp: 'red-menses' },
      { id: 'obs-2', date: '2026-07-02', code: 'M', stamp: 'red-menses' },
    ];
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, JSON.stringify(mockObs));

    const stats = getStorageStats();
    expect(stats.observationsCount).toBe(2);
    expect(stats.cyclesCount).toBeGreaterThanOrEqual(1);
    expect(stats.itemCount).toBeGreaterThan(0);
    expect(stats.estimatedBytes).toBeGreaterThan(0);
    expect(typeof stats.formattedSize).toBe('string');
  });

  describe('build-time values', () => {
    it('returns the package.json version and an ISO build date', () => {
      expect(getAppVersion()).toBe(pkg.version);
      expect(new Date(getBuildDate()).toISOString()).toBe(getBuildDate());
      expect(getVersionInfo().environment).toBe('test');
    });
  });

  describe('checkAndRecordVersionSeen', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('reports a new version when the stored version is older', () => {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, '0.0.1');
      expect(checkAndRecordVersionSeen()).toEqual({ isNewVersion: true, previousVersion: '0.0.1' });
      expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe(pkg.version);
    });

    it('reports no new version when storage throws', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      expect(checkAndRecordVersionSeen()).toEqual({ isNewVersion: false, previousVersion: null });
    });
  });

  describe('getStorageStats', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('returns zero values when storage is empty', () => {
      expect(getStorageStats()).toEqual({
        itemCount: 0,
        estimatedBytes: 0,
        formattedSize: '0 B',
        cyclesCount: 0,
        observationsCount: 0,
      });
    });

    it('formats sizes above 1 KB in KB and above 1 MB in MB', () => {
      localStorage.setItem('fertility_care_lang', 'x'.repeat(2048));
      expect(getStorageStats().formattedSize).toMatch(/^2\.\d{2} KB$/);
      localStorage.setItem('fertility_care_lang', 'x'.repeat(2 * 1024 * 1024));
      expect(getStorageStats().formattedSize).toMatch(/^2\.00 MB$/);
    });

    it('counts keys that the storage enumerates', () => {
      const store: Record<string, string> = { extra_key: 'abc' };
      vi.stubGlobal('localStorage', {
        length: 1,
        key: (i: number) => (i === 0 ? 'extra_key' : null),
        getItem: (k: string) => store[k] ?? null,
        extra_key: 'abc',
      });
      expect(getStorageStats()).toMatchObject({ itemCount: 1, estimatedBytes: 12 });
    });

    it('skips empty key names and ignores enumeration errors', () => {
      vi.stubGlobal('localStorage', {
        get length(): number {
          throw new Error('denied');
        },
        key: () => '',
        getItem: () => null,
      });
      expect(getStorageStats().itemCount).toBe(0);

      vi.stubGlobal('localStorage', { length: 1, key: () => '', getItem: () => null });
      expect(getStorageStats().itemCount).toBe(0);
    });

    it('ignores stored observations that are not an array', () => {
      localStorage.setItem(STORAGE_OBSERVATIONS_KEY, JSON.stringify({ not: 'an array' }));
      expect(getStorageStats()).toMatchObject({ observationsCount: 0, cyclesCount: 0 });
    });

    it('returns zero values when stored observations are not valid JSON', () => {
      localStorage.setItem(STORAGE_OBSERVATIONS_KEY, '{broken');
      expect(getStorageStats().observationsCount).toBe(0);
    });

    it('returns zero values when localStorage is not available', () => {
      vi.stubGlobal('localStorage', undefined);
      expect(getStorageStats().itemCount).toBe(0);
    });
  });
});
