import { describe, expect, it } from 'vitest';
import { VaultError } from '../../sync/deviceVault';
import { failureOf } from '../syncFailure';

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
  });
});
