import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { DESKTOP_QUERY, WIDE_QUERY } from '../hooks/useMediaQuery';
import { en } from '../i18n';
import { makeObservation } from '../test/factories';
import type { ObservationInput } from '../types/crms';
import { addDays, getTodayStr } from '../utils/dateUtils';
import { STORAGE_HAS_SEEN_WELCOME_KEY, STORAGE_OBSERVATIONS_KEY } from '../utils/storageKeys';

const sync = vi.hoisted(() => ({ sharedDays: null as ObservationInput[] | null }));

vi.mock('../hooks/useSync', () => ({
  useSync: () => ({
    services: () => Promise.reject(new Error('No sync in this test')),
    syncNow: async () => ({ sent: false, skipped: false, error: null }),
    withSync: () => Promise.reject(new Error('No sync in this test')),
    lastError: null,
    conflicts: [],
    resolveConflict: vi.fn(async () => {}),
    sharedDays: sync.sharedDays,
  }),
}));

const LONG_NOTE =
  'Shared note. A long note of the owner that the partner reads in full. A long note of the owner that the partner reads in full. A long note of the owner that the partner reads in full. A long note of the owner that the partner reads in full.';
const today = getTodayStr();
const yesterday = addDays(today, -1);
let desktop = false;

const nav = () => screen.getByRole('navigation', { name: en.mobileTabs.navLabel });
const sharedNote = () => screen.queryByText(en.sharedChart.note);

describe('App on a partner device with a shared chart', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    // The own day of the device, which the shared chart mode does not show
    localStorage.setItem(
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify([
        makeObservation({ date: today, bleeding: 'L', codeString: 'L', notes: 'My own day' }),
      ])
    );
    sync.sharedDays = [
      { date: yesterday, bleeding: 'H' },
      { date: today, bleeding: 'M', notes: LONG_NOTE },
    ];
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
    sync.sharedDays = null;
    window.history.replaceState(null, '', '/');
  });

  it('shows the shared chart read only on Today, with the note and without the + button', async () => {
    render(<App />);
    expect(screen.getByRole('note')).toHaveTextContent(en.sharedChart.note);
    const page = await screen.findByRole('tabpanel', { name: en.tabs.today });
    // The code of the shared day, not the own day
    const code = within(page).getByLabelText(en.labels.directInput);
    expect(code).toHaveValue('M');
    expect(code).toBeDisabled();
    // The whole note shows as text, because the disabled row cannot open
    const note = within(page).getByText(LONG_NOTE);
    expect(note).toHaveClass('obs-notes-text');
    expect(note.closest('button')).toBeNull();
    // The notes row, which a disabled fieldset cannot open, does not show
    expect(
      within(page).queryByRole('button', { name: new RegExp(en.observationForm.notes) })
    ).toBeNull();
    expect(within(page).queryByRole('button', { name: en.actions.save })).toBeNull();
    expect(
      within(page).queryByRole('button', { name: en.observationForm.actionsLabel })
    ).toBeNull();
    expect(within(nav()).queryByRole('button', { name: en.mobileTabs.log })).toBeNull();
    // The own day stays in the storage
    expect(localStorage.getItem(STORAGE_OBSERVATIONS_KEY)).toContain('My own day');
  });

  it('opens a day of the chart read only in the drawer on a phone', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(`^Cycle Day 1, Date ${yesterday}`) })
    );
    const drawer = await screen.findByRole('dialog', { name: en.drawer.viewTitle });
    expect(within(drawer).getByLabelText(en.labels.date)).toBeDisabled();
    expect(
      within(drawer).queryByRole('button', { name: new RegExp(en.observationForm.notes) })
    ).toBeNull();
    expect(drawer.querySelector('.obs-notes-text')).toHaveTextContent(en.observationForm.none);
    expect(within(drawer).queryByRole('button', { name: en.actions.save })).toBeNull();
    expect(
      within(drawer).queryByRole('button', { name: en.observationForm.actionsLabel })
    ).toBeNull();
    const footer = drawer.querySelector('.drawer-footer') as HTMLElement;
    fireEvent.click(within(footer).getByRole('button', { name: en.sync.close }));
    expect(screen.queryByRole('dialog', { name: en.drawer.viewTitle })).toBeNull();
  });

  it('lists the cycles of the shared chart in the cycle picker, and opens the one that the user selects', async () => {
    const older = addDays(today, -40);
    sync.sharedDays = [
      { date: older, bleeding: 'H' },
      { date: yesterday, bleeding: 'H', isCycleStart: true },
      { date: today, bleeding: 'M' },
    ];
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
    await screen.findByRole('tabpanel', { name: en.tabs.chart });
    fireEvent.click(
      screen.getAllByRole('button', { name: en.cyclePicker.buttonLabel })[0] as HTMLElement
    );
    const list = await screen.findByRole('listbox');
    // All cycles, and the two cycles of the shared chart: not the one cycle of the own days
    const options = within(list).getAllByRole('option');
    expect(options).toHaveLength(3);
    const oldest = options.find(
      option => option.getAttribute('aria-selected') === 'false' && option !== options[0]
    ) as HTMLElement;
    fireEvent.click(oldest);
    expect(
      await screen.findByRole('button', { name: new RegExp(`^Cycle Day 1, Date ${older}`) })
    ).toBeInTheDocument();
  });

  it('shows the day bar of the desktop chart without Edit', async () => {
    desktop = true;
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(`^Cycle Day 1, Date ${yesterday}`) })
    );
    const detail = screen.getByRole('region', { name: en.chartStrip.detailLabel });
    expect(within(detail).getByRole('button', { name: en.chartStrip.openInToday })).toBeVisible();
    expect(within(detail).queryByRole('button', { name: en.chartStrip.editDay })).toBeNull();
  });

  it('opens Today without the drawer from the Log Observation shortcut', async () => {
    window.history.replaceState(null, '', '/?shortcut=log');
    render(<App />);
    expect(await screen.findByRole('tabpanel', { name: en.tabs.today })).toBeInTheDocument();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the own observations without a shared chart', async () => {
    sync.sharedDays = null;
    render(<App />);
    const page = await screen.findByRole('tabpanel', { name: en.tabs.today });
    const code = within(page).getByLabelText(en.labels.directInput);
    expect(code).toHaveValue('L');
    expect(code).not.toBeDisabled();
    expect(sharedNote()).toBeNull();
    expect(within(nav()).getByRole('button', { name: en.mobileTabs.log })).toBeInTheDocument();
  });
});
