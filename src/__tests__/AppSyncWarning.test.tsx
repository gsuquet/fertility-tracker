import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { en } from '../i18n';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';

const sync = vi.hoisted(() => ({ failures: 0 }));

vi.mock('../hooks/useSync', () => ({
  useSync: () => ({
    services: () => Promise.reject(new Error('No sync in this test')),
    syncNow: async () => ({ sent: false, skipped: false, error: null }),
    withSync: () => Promise.reject(new Error('No sync in this test')),
    lastError: null,
    conflicts: [],
    resolveConflict: async () => {},
    sharedDays: null,
    hasRecord: true,
    failures: sync.failures,
    lastSyncedAt: null,
  }),
}));

describe('App sync warning', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
  });

  afterEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('shows the warning on the gear after two failed syncs in a row', () => {
    sync.failures = 2;
    render(<App />);
    expect(screen.getByRole('button', { name: en.settings.openSyncWarning })).toBeInTheDocument();
  });

  it('has no warning after one failed sync, and leaves the sign-in path at the start', () => {
    sync.failures = 1;
    window.history.replaceState(null, '', '/sign-in#chart');
    render(<App />);
    expect(screen.getByRole('button', { name: en.settings.open })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(window.location.hash).toBe('#chart');
  });
});
