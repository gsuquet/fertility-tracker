import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import pkg from '../../../package.json';
import { resolveCommitHash } from '../../../scripts/version/commitHash';
import {
  getAppVersion,
  getBuildDate,
  getCommitHash,
  checkAndRecordVersionSeen,
} from '../appVersion';
import { LAST_SEEN_VERSION_KEY } from '../../utils/storageKeys';

describe('appVersion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the package.json version and an ISO build date', () => {
    expect(getAppVersion()).toBe(pkg.version);
    expect(new Date(getBuildDate()).toISOString()).toBe(getBuildDate());
  });

  it('returns the short commit hash of the build', () => {
    expect(getCommitHash()).toBe(resolveCommitHash(process.env));
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
