import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { en } from '../i18n';
import { STORAGE_HAS_SEEN_WELCOME_KEY, STORAGE_OBSERVATIONS_KEY } from '../utils/storageKeys';
import { makeObservation } from '../test/factories';
import { getTodayStr } from '../utils/dateUtils';

type Consumer = (params: { targetURL?: string }) => void;

/** Stubs the launch queue of Chromium and returns a function that sends one launch. */
const stubLaunchQueue = () => {
  let consumer: Consumer | undefined;
  Object.defineProperty(window, 'launchQueue', {
    configurable: true,
    value: { setConsumer: (fn: Consumer) => (consumer = fn) },
  });
  return (shortcut: string) =>
    act(() => consumer?.({ targetURL: `${window.location.origin}/?shortcut=${shortcut}` }));
};

const visit = (path: string) => window.history.replaceState(null, '', path);

describe('App launched from a shortcut of the app icon', () => {
  beforeEach(() => localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true'));
  afterEach(() => {
    visit('/');
    Reflect.deleteProperty(window, 'launchQueue');
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

  it('opens the Today page without a dialog on a normal launch', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
