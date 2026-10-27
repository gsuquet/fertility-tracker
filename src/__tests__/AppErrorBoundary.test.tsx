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
  WelcomeModal: ({ isOpen }: { isOpen: boolean }) => {
    if (isOpen) throw new Error('Failed to fetch dynamically imported module');
    return null;
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

  it('shows a reload alert when a lazy dialog fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByRole('button', { name: en.errorBoundary.reload })
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
