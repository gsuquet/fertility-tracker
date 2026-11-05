import { describe, expect, it } from 'vitest';
import { VaultError } from '../../sync/deviceVault';
import {
  failureCodeOf,
  failureOf,
  isOutOfVault,
  isStorageBlocked,
  STORAGE_BLOCKED,
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
