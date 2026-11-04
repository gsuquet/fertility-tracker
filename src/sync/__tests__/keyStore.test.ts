import { describe, expect, it } from 'vitest';
import { createFakeIndexedDb } from '../../test/fakeIndexedDb';
import { openKeyStore } from '../keyStore';
import type { DeviceRecord } from '../keyStore';

const record = (): DeviceRecord => ({
  vaultId: 'v',
  memberId: 'm',
  role: 'owner',
  token: 't',
  privateKey: {} as CryptoKey,
  publicKey: 'p',
  trustedSigningKey: 's',
  last: { counter: 1, digest: 'd' },
});

describe('key store', () => {
  it('saves, loads and clears the device record', async () => {
    const { factory, state, databases } = createFakeIndexedDb();
    const store = openKeyStore(factory);
    expect(await store.load()).toBeNull();
    const saved = record();
    await store.save(saved);
    expect(await store.load()).toEqual(saved);
    expect(databases.get('fertility-tracker-sync')?.get('device')?.get('current')).toEqual(saved);
    await store.clear();
    expect(await store.load()).toBeNull();
    // Each call closes its connection
    expect(state.closed).toBe(5);
  });

  it('gives the error of a failed open or a failed request', async () => {
    const { factory, state } = createFakeIndexedDb();
    const store = openKeyStore(factory);
    state.failNextOpen = true;
    await expect(store.load()).rejects.toThrow('Fake failure');
    await store.save(record());
    state.failNextRequest = true;
    await expect(store.load()).rejects.toThrow('Fake failure');
    state.failNextRequest = true;
    await expect(store.save(record())).rejects.toThrow('Fake failure');
    // A commit that aborts without an error event
    state.abortNextCommit = true;
    await expect(store.save(record())).rejects.toThrow('Aborted');
  });

  it('uses the IndexedDB of the browser by default', () => {
    expect(() => openKeyStore()).not.toThrow();
  });
});
