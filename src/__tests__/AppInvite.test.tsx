import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { en } from '../i18n';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';

const sync = vi.hoisted(() => ({ enabled: false }));

vi.mock('../hooks/useSync', () => ({
  useSync: () => ({
    enabled: sync.enabled,
    services: () => Promise.reject(new Error('No sync in this test')),
    syncNow: async () => {},
    withSync: () => Promise.reject(new Error('No sync in this test')),
    lastError: null,
  }),
}));

const FRAGMENT = '#invite=abc.def';

describe('App with an invitation link', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    window.history.replaceState(null, '', `/${FRAGMENT}`);
  });
  afterEach(() => {
    sync.enabled = false;
    window.history.replaceState(null, '', '/');
  });

  it('opens the join dialog and removes the link from the address when the sync is on', async () => {
    sync.enabled = true;
    render(<App />);
    expect(window.location.hash).not.toBe(FRAGMENT);
    const dialog = await screen.findByRole('dialog', { name: en.sync.joinTitle });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(en.sync.failed);
    fireEvent.click(within(dialog).getByRole('button', { name: en.sync.close }));
    expect(screen.queryByRole('dialog', { name: en.sync.joinTitle })).toBeNull();
  });

  it('ignores the link while the sync is off', async () => {
    render(<App />);
    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: en.sync.joinTitle })).toBeNull();
  });
});
