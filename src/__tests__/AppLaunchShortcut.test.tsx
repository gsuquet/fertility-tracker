import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { en } from '../i18n';
import { STORAGE_HAS_SEEN_WELCOME_KEY, STORAGE_OBSERVATIONS_KEY } from '../utils/storageKeys';
import { makeObservation } from '../test/factories';
import { getTodayStr } from '../utils/dateUtils';

type Consumer = (params: { targetURL?: string; files?: { getFile(): Promise<File> }[] }) => void;

let consumer: Consumer | undefined;

/** Stubs the launch queue of Chromium and returns a function that sends one launch. */
const stubLaunchQueue = () => {
  Object.defineProperty(window, 'launchQueue', {
    configurable: true,
    value: { setConsumer: (fn: Consumer) => (consumer = fn) },
  });
  return (shortcut: string) =>
    act(() => consumer?.({ targetURL: `${window.location.origin}/?shortcut=${shortcut}` }));
};

/** Sends a backup file that the user opened with the app. */
const openFile = (text: string) =>
  act(() =>
    consumer?.({
      targetURL: `${window.location.origin}/?restore=file`,
      files: [{ getFile: async () => new File([text], 'b.ftbackup') }],
    })
  );

const visit = (path: string) => window.history.replaceState(null, '', path);

describe('App launched from a shortcut of the app icon', () => {
  beforeEach(() => localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true'));
  afterEach(() => {
    visit('/');
    Reflect.deleteProperty(window, 'launchQueue');
    consumer = undefined;
  });

  it('opens the Today page with the drawer for a new observation', async () => {
    visit('/?shortcut=log');
    render(<App />);
    expect(await screen.findByRole('dialog', { name: en.actions.newEntry })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(window.location.search).toBe('');
  });

  it('opens the chart page', () => {
    visit('/?shortcut=chart');
    render(<App />);
    expect(screen.getByRole('tab', { name: en.tabs.chart })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.location.search).toBe('');
    // The hash keeps the page after a reload
    expect(window.location.hash).toBe('#chart');
  });

  it('shows only the welcome guide at the first visit, not the drawer as well', async () => {
    localStorage.removeItem(STORAGE_HAS_SEEN_WELCOME_KEY);
    visit('/?shortcut=log');
    render(<App />);
    expect(
      await screen.findByRole('dialog', { name: en.welcomeModal.title }, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: en.actions.newEntry })).toBeNull();
  });

  it('follows a shortcut of the app icon while the window is open, without a reload', async () => {
    const launch = stubLaunchQueue();
    render(<App />);
    launch('chart');
    expect(screen.getByRole('tab', { name: en.tabs.chart })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    launch('log');
    expect(await screen.findByRole('dialog', { name: en.actions.newEntry })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('keeps an open drawer and its draft when Log today comes while the window is open', () => {
    const today = getTodayStr();
    const saved = makeObservation({ date: today, stretch: '0', codeString: '0' });
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, JSON.stringify([saved]));
    const launch = stubLaunchQueue();
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: en.tabs.calendar }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Date ${today}`) }));
    const drawer = screen.getByRole('dialog', { name: en.drawer.editTitle });
    fireEvent.change(within(drawer).getByLabelText(en.labels.directInput), {
      target: { value: '10KL' },
    });
    launch('log');
    expect(screen.getByRole('dialog', { name: en.drawer.editTitle })).toBe(drawer);
    expect(within(drawer).getByLabelText(en.labels.directInput)).toHaveValue('10KL');
  });

  it('restores a backup file that the user opened with the app, after the confirmation', async () => {
    const saved = makeObservation({ date: '2026-09-01', stretch: '0', codeString: '0' });
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, JSON.stringify([saved]));
    visit('/?restore=file');
    stubLaunchQueue();
    render(<App />);
    expect(window.location.search).toBe('');
    const file = [makeObservation({ date: '2026-09-02', stretch: '10', codeString: '10' })];
    await openFile(JSON.stringify(file));
    const confirm = await screen.findByRole('dialog', { name: en.confirmDialog.importTitle });
    // Nothing changes before the user chooses
    expect(JSON.parse(localStorage.getItem(STORAGE_OBSERVATIONS_KEY) ?? '[]')).toHaveLength(1);
    fireEvent.click(within(confirm).getByRole('button', { name: en.confirmDialog.importMerge }));
    expect(screen.queryByRole('dialog', { name: en.exportModal.title })).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_OBSERVATIONS_KEY) ?? '[]')).toHaveLength(2);

    // A second file opens the dialog again, and a file that is not a backup shows the error
    await openFile('not a backup');
    expect(await screen.findByRole('alert')).toHaveTextContent(en.exportModal.importError);
  });

  it('opens the Today page without a dialog on a normal launch', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
