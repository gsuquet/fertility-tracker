import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';
import { en } from '../i18n';
import { openShareChart, openVersionNotes } from '../test/appActions';

// Chunks that the server no longer has, for example in an old tab after a new deploy
vi.mock('../components/PrintExportView', () => {
  throw new Error('Failed to fetch dynamically imported module');
});
vi.mock('../components/VersionModal', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

describe('App with chunks that fail to load', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a print error instead of the success toast, and does not print', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<App />);
    await openShareChart();
    const dialog = await screen.findByRole(
      'dialog',
      { name: en.exportModal.title },
      { timeout: 5000 }
    );
    fireEvent.click(within(dialog).getByRole('button', { name: en.exportModal.printPdf }));

    expect(await screen.findByText(en.exportModal.printError)).toBeInTheDocument();
    expect(screen.queryByText(en.exportModal.exportSuccess)).toBeNull();
    expect(print).not.toHaveBeenCalled();
  });

  it('shows an error dialog for a dialog chunk that the preload could not import', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    openVersionNotes();
    const failed = await screen.findByRole(
      'dialog',
      { name: en.errorBoundary.title },
      { timeout: 5000 }
    );
    expect(within(failed).getByRole('button', { name: en.errorBoundary.reload })).toBeVisible();
  });
});
