import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';
import { en } from '../i18n';

// Chunks that arrive only when the test releases them, as on a slow network
const chunks = vi.hoisted(() => {
  const gate = () => {
    let release = () => {};
    const ready = new Promise<void>(resolve => {
      release = resolve;
    });
    return { ready, release: () => release() };
  };
  return { print: gate(), version: gate() };
});

vi.mock('../components/PrintExportView', async importOriginal => {
  await chunks.print.ready;
  return importOriginal();
});
vi.mock('../components/VersionModal', async importOriginal => {
  await chunks.version.ready;
  return importOriginal();
});

describe('App lazy chunks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('announces a dialog that loads, then shows it', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    fireEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: en.versionTracker.title })
    );
    expect(screen.getByRole('status')).toHaveTextContent(en.common.loading);
    expect(screen.queryByRole('dialog')).toBeNull();

    await act(async () => chunks.version.release());
    expect(
      await screen.findByRole('dialog', { name: en.versionTracker.title }, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.queryByText(en.common.loading)).toBeNull();
  });

  it('prints only after the print view chunk has rendered the cycles', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    let printedReport: Element | null = null;
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      printedReport = document.querySelector('.print-export-container');
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: en.actions.exportPdf }));
    const dialog = await screen.findByRole(
      'dialog',
      { name: en.exportModal.title },
      { timeout: 5000 }
    );
    fireEvent.click(within(dialog).getByRole('button', { name: en.exportModal.printPdf }));
    expect(print).not.toHaveBeenCalled();

    await act(async () => chunks.print.release());
    await vi.waitFor(() => expect(print).toHaveBeenCalledOnce(), { timeout: 5000 });
    expect(printedReport).not.toBeNull();
  });
});
