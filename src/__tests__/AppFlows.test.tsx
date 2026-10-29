import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { App } from '../App';
import { STORAGE_HAS_SEEN_WELCOME_KEY, STORAGE_OBSERVATIONS_KEY } from '../utils/storageKeys';
import { DESKTOP_QUERY } from '../hooks/useMediaQuery';
import { makeObservation } from '../test/factories';
import { getTodayStr } from '../utils/dateUtils';
import { en } from '../i18n';

const footer = () => screen.getByRole('contentinfo');

describe('App flows', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the welcome guide on the first visit only', async () => {
    const { unmount } = render(<App />);
    // The guide is a lazy chunk: the first load can take more than 1 s under coverage
    const guide = await screen.findByRole(
      'dialog',
      { name: en.welcomeModal.title },
      { timeout: 5000 }
    );
    fireEvent.click(within(guide).getByRole('button', { name: en.welcomeModal.skip }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    render(<App />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the selected day of the desktop chart in Today', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    localStorage.setItem(
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify([makeObservation({ date: getTodayStr(), bleeding: 'H', codeString: 'H' })])
    );
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({
          matches: query === DESKTOP_QUERY,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
    const detail = await screen.findByRole('region', { name: en.chartStrip.detailLabel });
    fireEvent.click(within(detail).getByRole('button', { name: en.chartStrip.openInToday }));
    expect(await screen.findByRole('tabpanel', { name: en.tabs.today })).toBeInTheDocument();
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
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
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });

    fireEvent.click(within(footer()).getByRole('button', { name: en.versionTracker.title }));
    const notes = await screen.findByRole('dialog', { name: en.versionTracker.title });
    fireEvent.click(
      within(notes).getAllByRole('button', { name: en.versionTracker.close })[0] as HTMLElement
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('starts each opening of a dialog anew', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    const openNotes = () => {
      fireEvent.click(within(footer()).getByRole('button', { name: en.versionTracker.title }));
      return screen.findByRole('dialog', { name: en.versionTracker.title });
    };
    let notes = await openNotes();
    fireEvent.click(within(notes).getByRole('tab', { name: en.versionTracker.tabSystemInfo }));
    fireEvent.keyDown(notes, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    notes = await openNotes();
    expect(
      within(notes).getByRole('tab', { name: en.versionTracker.tabReleaseNotes })
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(notes, { key: 'Escape' });

    const openGuide = () => {
      fireEvent.click(within(footer()).getByRole('button', { name: en.welcomeModal.title }));
      return screen.findByRole('dialog', { name: en.welcomeModal.title });
    };
    let guide = await openGuide();
    fireEvent.click(within(guide).getByRole('button', { name: en.welcomeModal.next }));
    expect(within(guide).getByText('Step 2 of 4')).toBeInTheDocument();
    fireEvent.keyDown(guide, { key: 'Escape' });
    guide = await openGuide();
    expect(within(guide).getByText('Step 1 of 4')).toBeInTheDocument();
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

  it('restores the original title after a second print within one second', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    vi.spyOn(window, 'print').mockImplementation(() => {});
    document.title = 'Fertility Tracker';
    render(<App />);
    const printAll = () => {
      fireEvent.click(screen.getByRole('button', { name: en.actions.exportPdf }));
      const dialog = screen.getByRole('dialog', { name: en.exportModal.title });
      fireEvent.click(within(dialog).getByRole('button', { name: en.exportModal.printPdf }));
    };
    // Load the lazy export dialog before the timers are fake
    fireEvent.click(screen.getByRole('button', { name: en.actions.exportPdf }));
    fireEvent.keyDown(await screen.findByRole('dialog', { name: en.exportModal.title }), {
      key: 'Escape',
    });

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    printAll();
    act(() => vi.advanceTimersByTime(500));
    printAll();
    expect(document.title).toMatch(/all-cycles/);
    // One title timer and one toast timer: the first ones are cancelled
    expect(vi.getTimerCount()).toBe(2);

    act(() => vi.advanceTimersByTime(1000));
    expect(document.title).toBe('Fertility Tracker');
    act(() => vi.advanceTimersByTime(2499));
    expect(screen.getByRole('status')).toHaveTextContent(en.exportModal.exportSuccess);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('cancels the title and toast timers when the app unmounts', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: en.actions.exportPdf }));
    const dialog = await screen.findByRole('dialog', { name: en.exportModal.title });

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.click(within(dialog).getByRole('button', { name: en.exportModal.printPdf }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('confirms the demo data over saved data and undoes it from the toast', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    localStorage.setItem(
      'fertility_care_observations',
      JSON.stringify([{ date: '2026-06-01', bleeding: 'H' }])
    );
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: en.actions.exportPdf }));
    const exportDialog = await screen.findByRole('dialog', { name: en.exportModal.title });
    fireEvent.click(within(exportDialog).getByRole('button', { name: en.actions.loadDemo }));
    const confirmDialog = screen.getByRole('dialog', { name: en.confirmDialog.demoTitle });
    fireEvent.click(
      within(confirmDialog).getByRole('button', { name: en.confirmDialog.demoConfirm })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(en.undoToast.demo);

    fireEvent.click(screen.getByRole('button', { name: en.undoToast.undo }));
    expect(screen.queryByRole('status')).toBeNull();
    const stored = JSON.parse(localStorage.getItem('fertility_care_observations') as string);
    expect(stored).toHaveLength(1);
  });

  it('opens the export dialog from the save warning and from the backup reminder', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    localStorage.setItem('fertility_care_backup_reminder_start', '2026-01-01');
    localStorage.setItem(
      'fertility_care_observations',
      JSON.stringify([{ date: '2026-06-01', bleeding: 'H' }])
    );
    const setItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'fertility_care_observations') throw new Error('QuotaExceededError');
      setItem(key, value);
    });
    render(<App />);
    const warning = screen.getByRole('alert');
    fireEvent.click(within(warning).getByRole('button', { name: en.storageWarning.backUpNow }));
    const exportDialog = await screen.findByRole('dialog', { name: en.exportModal.title });
    fireEvent.click(within(exportDialog).getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).toBeNull();

    const reminder = screen.getByRole('note');
    fireEvent.click(within(reminder).getByRole('button', { name: en.backupReminder.backUpNow }));
    expect(await screen.findByRole('dialog', { name: en.exportModal.title })).toBeInTheDocument();
  });
});
