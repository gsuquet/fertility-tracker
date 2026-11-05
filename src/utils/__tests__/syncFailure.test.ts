import { describe, expect, it } from 'vitest';
import { VaultError } from '../../sync/deviceVault';
import {
  failureCodeOf,
  failureOf,
  isOutOfVault,
  isStorageBlocked,
  needsAttention,
  STORAGE_BLOCKED,
  WARNING_AGE_MS,
} from '../syncFailure';

describe('failureOf', () => {
  it('gives the cause of each error', () => {
    expect(failureOf(new Error('x'))).toBe('failed');
    expect(failureOf('x')).toBe('failed');
    expect(failureOf(new VaultError('code'))).toBe('badCode');
    expect(failureOf(new VaultError('keys'))).toBe('failed');
    expect(failureOf(new VaultError('relay'))).toBe('failed');
    expect(failureOf(new VaultError('relay', { status: 0 }))).toBe('noConnection');
    expect(failureOf(new VaultError('relay', { status: 503 }))).toBe('unavailable');
    expect(failureOf(new VaultError('relay', { status: 404 }))).toBe('failed');
    expect(failureOf(new VaultError('relay', { status: 404 }), true)).toBe('badCode');
    expect(failureOf(new VaultError('relay', { status: 500 }), true)).toBe('failed');
    expect(failureOf(new VaultError('relay', { status: 403, error: 'host' }))).toBe('wrongHost');
    expect(failureOf(new VaultError('relay', { status: 403, error: 'owner' }))).toBe('failed');
    expect(failureOf(new VaultError('relay', { status: 429 }))).toBe('busy');
    expect(failureOf(new VaultError('relay', { status: 302, error: 'signIn' }))).toBe('signIn');
    expect(failureOf(new VaultError('relay', { status: 302 }))).toBe('failed');
  });
});

describe('failureCodeOf', () => {
  it('gives the status and the error of the relay, the reason, or the name of the error', () => {
    expect(failureCodeOf(new VaultError('relay', { status: 403, error: 'owner' }))).toBe(
      '403 owner'
    );
    expect(failureCodeOf(new VaultError('relay', { status: 500 }))).toBe('500');
    expect(failureCodeOf(new VaultError('relay'))).toBe('');
    expect(failureCodeOf(new VaultError('keys'))).toBe('keys');
    expect(failureCodeOf(new TypeError('x'))).toBe('TypeError');
    expect(failureCodeOf('x')).toBeNull();
    expect(failureCodeOf(null)).toBeNull();
  });
});

describe('isOutOfVault', () => {
  it('is true only for a removed device, an unknown token or a missing vault', () => {
    expect(isOutOfVault(new VaultError('removed'))).toBe(true);
    expect(isOutOfVault(new VaultError('relay', { status: 401 }))).toBe(true);
    expect(isOutOfVault(new VaultError('relay', { status: 404 }))).toBe(true);
    expect(isOutOfVault(new VaultError('relay', { status: 0 }))).toBe(false);
    expect(isOutOfVault(new VaultError('keys'))).toBe(false);
    expect(isOutOfVault(new Error('x'))).toBe(false);
    expect(isOutOfVault(null)).toBe(false);
  });
});

describe('isStorageBlocked', () => {
  it('is true only for an error with the name of a blocked storage', () => {
    expect(isStorageBlocked(Object.assign(new Error('x'), { name: STORAGE_BLOCKED }))).toBe(true);
    expect(isStorageBlocked(new Error('x'))).toBe(false);
    expect(isStorageBlocked({ name: STORAGE_BLOCKED })).toBe(false);
  });
});

describe('needsAttention', () => {
  const now = 10 * WARNING_AGE_MS;
  const fine = { hasRecord: true, lastError: null, failures: 0, lastSyncedAt: now - 1000 };
  const signIn = new VaultError('relay', { status: 302, error: 'signIn' });
  const offline = new VaultError('relay', { status: 0 });

  it('is true for an expired sign-in, two failures in a row or a sync older than one day', () => {
    expect(needsAttention(fine, now)).toBe(false);
    expect(needsAttention({ ...fine, lastError: signIn, failures: 1 }, now)).toBe(true);
    expect(needsAttention({ ...fine, lastError: offline, failures: 1 }, now)).toBe(false);
    expect(needsAttention({ ...fine, lastError: offline, failures: 2 }, now)).toBe(true);
    expect(needsAttention({ ...fine, lastSyncedAt: now - WARNING_AGE_MS }, now)).toBe(false);
    expect(needsAttention({ ...fine, lastSyncedAt: now - WARNING_AGE_MS - 1 }, now)).toBe(true);
    expect(needsAttention({ ...fine, lastSyncedAt: null }, now)).toBe(false);
  });

  it('is false without a known record', () => {
    const warned = { ...fine, lastError: signIn, failures: 3, lastSyncedAt: 0 };
    expect(needsAttention({ ...warned, hasRecord: false }, now)).toBe(false);
    expect(needsAttention({ ...warned, hasRecord: null }, now)).toBe(false);
  });
});
