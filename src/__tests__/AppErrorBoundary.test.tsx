import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';
import { en } from '../i18n';

// Simulates lazy chunks that fail to load, for example offline before the service worker cached them.
vi.mock('../components/CycleAnalyticsView', () => ({
  CycleAnalyticsView: () => {
    throw new Error('Failed to fetch dynamically imported module');
  },
}));
vi.mock('../components/WelcomeModal', () => ({
  WelcomeModal: () => {
    throw new Error('Failed to fetch dynamically imported module');
  },
}));

describe('App error boundaries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the layout and shows a reload alert when a lazy page fails', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    fireEvent.click(
      within(screen.getByRole('banner')).getByRole('tab', { name: en.tabs.analytics })
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(en.errorBoundary.title);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('removes the page alert when the tab changes', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    const tabs = within(screen.getByRole('banner'));
    fireEvent.click(tabs.getByRole('tab', { name: en.tabs.analytics }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(tabs.getByRole('tab', { name: en.tabs.today }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a lazy dialog failure in a visible dialog with Reload and Close', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    const failed = await screen.findByRole('dialog', { name: en.errorBoundary.title });
    const alert = within(failed).getByRole('alert');
    expect(alert).toHaveTextContent(en.errorBoundary.message);
    expect(within(alert).getByRole('button', { name: en.errorBoundary.reload })).toBeVisible();
    expect(screen.getByRole('banner')).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: en.errorBoundary.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('resets a failed dialog when it closes, so the other dialogs still open', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    const header = within(screen.getByRole('banner'));

    fireEvent.click(header.getByRole('button', { name: en.welcomeModal.title }));
    const failed = await screen.findByRole('dialog', { name: en.errorBoundary.title });
    fireEvent.keyDown(failed, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(header.getByRole('button', { name: en.versionTracker.title }));
    const notes = await screen.findByRole(
      'dialog',
      { name: en.versionTracker.title },
      { timeout: 5000 }
    );
    fireEvent.keyDown(notes, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // The next opening tries again
    fireEvent.click(header.getByRole('button', { name: en.welcomeModal.title }));
    expect(await screen.findByRole('dialog', { name: en.errorBoundary.title })).toBeInTheDocument();
  });
});
