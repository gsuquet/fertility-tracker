import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { en } from '../i18n';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';

vi.mock('../hooks/useSync', () => ({
  useSync: () => ({
    services: () => Promise.reject(new Error('No sync in this test')),
    syncNow: async () => {},
    withSync: () => Promise.reject(new Error('No sync in this test')),
    lastError: null,
    conflicts: [],
    resolveConflict: vi.fn(async () => {}),
    sharedDays: null,
  }),
}));

const FRAGMENT = '#invite=abc.def';

describe('App with an invitation link', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    window.history.replaceState(null, '', `/${FRAGMENT}`);
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('opens the join dialog and removes the link from the address', async () => {
    render(<App />);
    expect(window.location.hash).not.toBe(FRAGMENT);
    const dialog = await screen.findByRole('dialog', { name: en.sync.joinTitle });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(en.sync.failed);
    fireEvent.click(within(dialog).getByRole('button', { name: en.sync.close }));
    expect(screen.queryByRole('dialog', { name: en.sync.joinTitle })).toBeNull();
  });

  it('opens the join dialog for a link opened in an open tab, and the welcome guide after it', async () => {
    localStorage.removeItem(STORAGE_HAS_SEEN_WELCOME_KEY);
    window.history.replaceState(null, '', '/');
    render(<App />);
    const welcome = await screen.findByRole('dialog', { name: en.welcomeModal.title });
    fireEvent.click(within(welcome).getByRole('button', { name: en.actions.close }));
    window.history.pushState(null, '', `/${FRAGMENT}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const dialog = await screen.findByRole('dialog', { name: en.sync.joinTitle });
    expect(window.location.hash).toBe('');
    // Another fragment does nothing
    window.history.pushState(null, '', '/#chart');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(screen.getByRole('dialog', { name: en.sync.joinTitle })).toBe(dialog);
  });

  it('opens the welcome guide only after the join dialog', async () => {
    localStorage.removeItem(STORAGE_HAS_SEEN_WELCOME_KEY);
    render(<App />);
    const dialog = await screen.findByRole('dialog', { name: en.sync.joinTitle });
    expect(screen.queryByRole('dialog', { name: en.welcomeModal.title })).toBeNull();
    fireEvent.click(await within(dialog).findByRole('button', { name: en.sync.close }));
    expect(await screen.findByRole('dialog', { name: en.welcomeModal.title })).toBeInTheDocument();
  });
});
