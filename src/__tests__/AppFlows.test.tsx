import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { App } from '../App';
import { STORAGE_HAS_SEEN_WELCOME_KEY, STORAGE_OBSERVATIONS_KEY } from '../utils/storageKeys';
import { DESKTOP_QUERY, WIDE_QUERY } from '../hooks/useMediaQuery';
import { makeObservation } from '../test/factories';
import { addDays, getTodayStr } from '../utils/dateUtils';
import { en } from '../i18n';
import * as chartImage from '../utils/chartImage';
import { openFromSettings, openShareChart, openShareChartNow } from '../test/appActions';

const footer = () => screen.getByRole('contentinfo');

/** The desktop width for the next render. It goes back to a phone after each test. */
let desktop = false;

describe('App flows', () => {
  beforeEach(() => {
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({
          matches: desktop && (query === DESKTOP_QUERY || query === WIDE_QUERY),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
  });

  afterEach(() => {
    desktop = false;
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

  it('opens the selected day of the desktop chart in Today, and the Today tab on today', async () => {
    const yesterday = addDays(getTodayStr(), -1);
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    localStorage.setItem(
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify([
        makeObservation({ date: yesterday, bleeding: 'H', codeString: 'H' }),
        makeObservation({ date: getTodayStr(), bleeding: 'H', codeString: 'H' }),
      ])
    );
    desktop = true;
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(`^Cycle Day 1, Date ${yesterday}`) })
    );
    const detail = screen.getByRole('region', { name: en.chartStrip.detailLabel });
    fireEvent.click(within(detail).getByRole('button', { name: en.chartStrip.openInToday }));
    expect(await screen.findByText(en.todayView.yesterday, { exact: true })).toBeInTheDocument();

    // The Today tab opens on today again, after a visit to the chart
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.today }));
    await screen.findByRole('tabpanel', { name: en.tabs.today });
    expect(screen.queryByText(en.todayView.yesterday, { exact: true })).toBeNull();
  });

  it('opens the selected day of the desktop calendar in the chart and in Today', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    localStorage.setItem(
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify([makeObservation({ date: getTodayStr(), bleeding: 'H', codeString: 'H' })])
    );
    desktop = true;
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.calendar }));
    const panel = await screen.findByRole('region', { name: en.chartStrip.detailLabel });
    fireEvent.click(within(panel).getByRole('button', { name: en.chartStrip.openInChart }));
    expect(await screen.findByRole('tabpanel', { name: en.tabs.chart })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: en.tabs.calendar }));
    const again = await screen.findByRole('region', { name: en.chartStrip.detailLabel });
    fireEvent.click(within(again).getByRole('button', { name: en.chartStrip.openInToday }));
    expect(await screen.findByRole('tabpanel', { name: en.tabs.today })).toBeInTheDocument();
  });

  it('opens the chart from the current cycle of the wide desktop Today page', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    localStorage.setItem(
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify([makeObservation({ date: getTodayStr(), bleeding: 'H', codeString: 'H' })])
    );
    desktop = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: en.todayView.openChart }));
    expect(await screen.findByRole('tabpanel', { name: en.tabs.chart })).toBeInTheDocument();
  });

  it('opens the guide from Settings', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    await openFromSettings(en.settings.welcomeGuide);
    expect(await screen.findByRole('dialog', { name: en.welcomeModal.title })).toBeInTheDocument();
  });

  it('opens the legal notice and the version notes from the footer', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    // The footer is outside main
    expect(screen.getByRole('main')).not.toContainElement(footer());
    fireEvent.click(within(footer()).getByRole('button', { name: en.footer.legal }));
    const about = await screen.findByRole('dialog', { name: en.versionTracker.title });
    expect(
      within(about).getByRole('tab', { name: en.versionTracker.tabSystemInfo })
    ).toHaveAttribute('aria-selected', 'true');
    expect(within(about).getByText(en.footer.medicalTitle)).toBeInTheDocument();
    fireEvent.keyDown(about, { key: 'Escape' });

    fireEvent.click(within(footer()).getByRole('button', { name: /^v\d+\.\d+\.\d+$/ }));
    const notes = await screen.findByRole('dialog', { name: en.versionTracker.title });
    expect(
      within(notes).getByRole('tab', { name: en.versionTracker.tabReleaseNotes })
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(
      within(notes).getAllByRole('button', { name: en.versionTracker.close })[0] as HTMLElement
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('starts each opening of a dialog anew', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    const openNotes = () => {
      fireEvent.click(within(footer()).getByRole('button', { name: /^v\d+\.\d+\.\d+$/ }));
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

    const openGuide = async () => {
      await openFromSettings(en.settings.welcomeGuide);
      return screen.findByRole('dialog', { name: en.welcomeModal.title }, { timeout: 5000 });
    };
    let guide = await openGuide();
    fireEvent.click(within(guide).getByRole('button', { name: en.welcomeModal.next }));
    expect(within(guide).getByText('Step 2 of 4')).toBeInTheDocument();
    fireEvent.keyDown(guide, { key: 'Escape' });
    guide = await openGuide();
    expect(within(guide).getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('opens Share chart from the chart options menu', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
    fireEvent.click(await screen.findByRole('button', { name: en.chartStrip.optionsLabel }));
    fireEvent.click(screen.getByRole('menuitem', { name: en.chartStrip.shareChart }));
    expect(await screen.findByRole('dialog', { name: en.exportModal.title })).toBeInTheDocument();
  });

  it('tells the user when the chart image is downloaded, or when it fails', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    const download = vi
      .spyOn(chartImage, 'downloadChartPng')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    render(<App />);
    const downloadPng = async () => {
      await openShareChart();
      const dialog = await screen.findByRole('dialog', { name: en.exportModal.title });
      fireEvent.click(within(dialog).getByRole('button', { name: en.exportModal.downloadPng }));
    };
    await downloadPng();
    expect(await screen.findByRole('status')).toHaveTextContent(en.exportModal.pngSuccess);
    await downloadPng();
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(en.exportModal.pngError)
    );
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('opens the help and the about dialogs over Settings', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: en.settings.open }));
    const settings = await screen.findByRole('dialog', { name: en.settings.title });
    fireEvent.click(within(settings).getByRole('button', { name: en.settings.welcomeGuide }));
    const guide = await screen.findByRole(
      'dialog',
      { name: en.welcomeModal.title },
      { timeout: 5000 }
    );
    fireEvent.keyDown(guide, { key: 'Escape' });
    // Settings stays open under the guide
    expect(screen.getByRole('dialog', { name: en.settings.title })).toBeInTheDocument();
    fireEvent.click(within(settings).getByRole('button', { name: en.settings.legal }));
    expect(
      await screen.findByRole('dialog', { name: en.versionTracker.title })
    ).toBeInTheDocument();
  });

  it('prints the chosen cycles with a dated file name and restores the title', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    document.title = 'Fertility Tracker';
    render(<App />);
    await openShareChart();
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
      openShareChartNow();
      const dialog = screen.getByRole('dialog', { name: en.exportModal.title });
      fireEvent.click(within(dialog).getByRole('button', { name: en.exportModal.printPdf }));
    };
    // Load the lazy export dialog before the timers are fake
    await openShareChart();
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
    await openShareChart();
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
    fireEvent.click(screen.getByRole('button', { name: en.settings.open }));
    const settings = await screen.findByRole('dialog', { name: en.settings.title });
    fireEvent.click(within(settings).getByRole('button', { name: en.settings.loadDemo }));
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

  it('downloads a backup at once from the save warning and from the backup reminder', async () => {
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
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:backup'), revokeObjectURL: vi.fn() });
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    const reminder = screen.getByRole('note');
    fireEvent.click(within(reminder).getByRole('button', { name: en.backupReminder.backUpNow }));
    expect(download).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
    // The backup is recorded, so the reminder goes
    expect(screen.queryByRole('note')).toBeNull();

    const warning = screen.getByRole('alert');
    fireEvent.click(within(warning).getByRole('button', { name: en.storageWarning.backUpNow }));
    expect(download).toHaveBeenCalledTimes(2);
  });
});
