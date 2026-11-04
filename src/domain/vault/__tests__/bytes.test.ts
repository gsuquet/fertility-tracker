import { describe, expect, it } from 'vitest';
import { fromBase64Url, randomBytes, sha256, toBase64Url, utf8 } from '../bytes';

describe('bytes', () => {
  it('writes and reads base64url without padding', () => {
    const bytes = Uint8Array.from([251, 255, 191, 0, 1]);
    expect(toBase64Url(bytes)).toBe('-_-_AAE');
    expect(fromBase64Url('-_-_AAE')).toEqual(bytes);
    expect(fromBase64Url('')).toEqual(new Uint8Array());
  });

  it('gives null for a text that is not base64url', () => {
    for (const value of ['a+b', 'a/b', 'ab==', 'abcde', 7, null]) {
      expect(fromBase64Url(value)).toBeNull();
    }
  });

  it('gives random bytes, UTF-8 and SHA-256', async () => {
    expect(randomBytes(16)).toHaveLength(16);
    expect(randomBytes(16)).not.toEqual(randomBytes(16));
    expect(toBase64Url(await sha256(utf8('abc')))).toBe(
      'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0'
    );
  });
});
