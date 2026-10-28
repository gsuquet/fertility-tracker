import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { en } from '../i18n';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';

const visit = (path: string) => window.history.replaceState(null, '', path);

describe('App launched from a shortcut of the app icon', () => {
  beforeEach(() => localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true'));
  afterEach(() => visit('/'));

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
    let consumer: ((params: { targetURL?: string }) => void) | undefined;
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: { setConsumer: (fn: typeof consumer) => (consumer = fn) },
    });
    render(<App />);
    act(() => consumer?.({ targetURL: `${window.location.origin}/?shortcut=chart` }));
    expect(screen.getByRole('tab', { name: en.tabs.chart })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    act(() => consumer?.({ targetURL: `${window.location.origin}/?shortcut=log` }));
    expect(await screen.findByRole('dialog', { name: en.actions.newEntry })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    Reflect.deleteProperty(window, 'launchQueue');
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
