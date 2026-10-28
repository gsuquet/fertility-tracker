import { render, screen } from '@testing-library/react';
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

  it('opens the Today page without a dialog on a normal launch', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: en.tabs.today })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
