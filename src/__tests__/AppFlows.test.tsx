import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { App } from '../App';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../domain/versionTracker';
import { en } from '../i18n';

const footer = () => screen.getByRole('contentinfo');

describe('App flows', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the welcome guide on the first visit only', async () => {
    const { unmount } = render(<App />);
    const guide = await screen.findByRole('dialog', { name: en.welcomeModal.title });
    fireEvent.click(within(guide).getByRole('button', { name: en.welcomeModal.skip }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    render(<App />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the guide from the header', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    fireEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: en.welcomeModal.title })
    );
    expect(await screen.findByRole('dialog', { name: en.welcomeModal.title })).toBeInTheDocument();
  });

  it('opens the guide and the version notes from the footer', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    fireEvent.click(within(footer()).getByRole('button', { name: en.welcomeModal.title }));
    expect(await screen.findByRole('dialog', { name: en.welcomeModal.title })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(within(footer()).getByRole('button', { name: en.versionTracker.title }));
    const notes = await screen.findByRole('dialog', { name: en.versionTracker.title });
    fireEvent.click(
      within(notes).getAllByRole('button', { name: en.versionTracker.close })[0] as HTMLElement
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('prints the chosen cycles with a dated file name and restores the title', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    document.title = 'Fertility Tracker';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: en.actions.exportPdf }));
    const dialog = await screen.findByRole('dialog', { name: en.exportModal.title });

    vi.useFakeTimers({ toFake: ['setTimeout'] });
    let titleAtPrint = '';
    print.mockImplementation(() => {
      titleAtPrint = document.title;
    });
    fireEvent.click(within(dialog).getByRole('button', { name: en.exportModal.printPdf }));
    expect(print).toHaveBeenCalledOnce();
    expect(titleAtPrint).toMatch(/all-cycles/);
    expect(screen.getByRole('status')).toHaveTextContent(en.exportModal.exportSuccess);
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => vi.advanceTimersByTime(1000));
    expect(document.title).toBe('Fertility Tracker');
    act(() => vi.advanceTimersByTime(2500));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
