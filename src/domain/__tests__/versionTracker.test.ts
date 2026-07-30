import { describe, it, expect, beforeEach } from 'vitest';
import {
  getVersionInfo,
  getVersionHistory,
  getLatestRelease,
  checkAndRecordVersionSeen,
  getStorageStats,
  LAST_SEEN_VERSION_KEY,
  STORAGE_OBSERVATIONS_KEY,
  CRMS_SPEC_VERSION,
} from '../versionTracker';

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
    expect(latest.version).toBe('1.3.0');
    expect(latest.highlights.length).toBeGreaterThan(0);
    expect(latest.crmsSpecVersion).toBe('1.0.0');
  });

  it('correctly tracks and updates last seen version in localStorage', () => {
    // First run (no version stored)
    const check1 = checkAndRecordVersionSeen();
    expect(check1.isNewVersion).toBe(true);
    expect(check1.previousVersion).toBeNull();
    expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe('1.3.0');

    // Second run (same version stored)
    const check2 = checkAndRecordVersionSeen();
    expect(check2.isNewVersion).toBe(false);
    expect(check2.previousVersion).toBe('1.3.0');
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
});
