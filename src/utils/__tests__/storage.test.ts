import { describe, it, expect, afterEach, vi } from 'vitest';
import { readStorage, writeStorage, removeStorage } from '../storage';

describe('storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('writes, reads and removes a value', () => {
    expect(writeStorage('key', 'value')).toBe(true);
    expect(readStorage('key')).toBe('value');
    removeStorage('key');
    expect(readStorage('key')).toBeNull();
  });

  it('fails quietly when localStorage is not available', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readStorage('key')).toBeNull();
    expect(writeStorage('key', 'value')).toBe(false);
    expect(() => removeStorage('key')).not.toThrow();
  });
});
