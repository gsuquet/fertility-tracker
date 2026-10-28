import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { setShortcutsEnabled } from '../hooks/useKeyboardShortcuts';
import { en } from '../i18n';
import { addDays, formatDateDisplay, getTodayStr } from '../utils/dateUtils';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';

const press = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });

const tab = (name: string) => screen.getByRole('tab', { name });
const dayTitle = (offset: number) => formatDateDisplay(addDays(getTodayStr(), offset), 'en-US');

describe('App keyboard shortcuts', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
  });

  afterEach(() => {
    setShortcutsEnabled(true);
    window.history.replaceState(null, '', '/');
  });

  it('opens the four pages with the digits, also with the keys of AZERTY', () => {
    render(<App />);
    press('2');
    expect(tab(en.tabs.chart)).toHaveAttribute('aria-selected', 'true');
    press('3');
    expect(tab(en.tabs.calendar)).toHaveAttribute('aria-selected', 'true');
    press("'", { code: 'Digit4' });
    expect(tab(en.tabs.analytics)).toHaveAttribute('aria-selected', 'true');
    press('&', { code: 'Digit1' });
    expect(tab(en.tabs.today)).toHaveAttribute('aria-selected', 'true');
  });

  it('leaves Ctrl+P and the other keys with a modifier to the browser', () => {
    render(<App />);
    press('2', { ctrlKey: true });
    expect(tab(en.tabs.today)).toHaveAttribute('aria-selected', 'true');
  });

  it('changes the day with the arrows and goes back to today with T, only on Today', () => {
    render(<App />);
    press('ArrowLeft');
    press('ArrowLeft');
    expect(screen.getByText(dayTitle(-2))).toBeInTheDocument();
    press('ArrowRight');
    expect(screen.getByText(dayTitle(-1))).toBeInTheDocument();
    press('t');
    expect(screen.getByText(dayTitle(0))).toBeInTheDocument();
    // On the chart, the arrows stay with the chart
    press('2');
    press('ArrowLeft');
    press('1');
    expect(screen.getByText(dayTitle(0))).toBeInTheDocument();
  });

  it('does not use the keys that the user types in a field', () => {
    render(<App />);
    const notes = screen.getByPlaceholderText(en.todayView.notesPlaceholder);
    notes.focus();
    press('2');
    press('ArrowLeft');
    expect(tab(en.tabs.today)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(dayTitle(0))).toBeInTheDocument();
  });

  it('opens Today for a new observation with N', () => {
    render(<App />);
    press('ArrowLeft');
    press('3');
    press('n');
    expect(tab(en.tabs.today)).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the shortcuts dialog with ?, blocks the keys there and turns them off', async () => {
    render(<App />);
    press('?');
    const dialog = await screen.findByRole('dialog', { name: en.shortcuts.title });
    press('2');
    expect(tab(en.tabs.today)).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(dialog).getByRole('checkbox', { name: en.shortcuts.enable }));
    fireEvent.click(within(dialog).getAllByRole('button', { name: en.actions.close })[0]!);
    expect(screen.queryByRole('dialog')).toBeNull();
    // The shortcuts are off: the keys and the tooltips do nothing
    press('2');
    press('?');
    expect(tab(en.tabs.today)).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(tab(en.tabs.chart)).not.toHaveAttribute('aria-keyshortcuts');
  });

  it('opens the shortcuts dialog from the footer and from the version dialog', async () => {
    render(<App />);
    fireEvent.click(
      within(screen.getByRole('contentinfo')).getByRole('button', { name: en.shortcuts.title })
    );
    const dialog = await screen.findByRole('dialog', { name: en.shortcuts.title });
    fireEvent.click(within(dialog).getAllByRole('button', { name: en.actions.close })[0]!);

    fireEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: en.versionTracker.title })
    );
    const version = await screen.findByRole('dialog', { name: en.versionTracker.title });
    fireEvent.click(within(version).getByRole('button', { name: en.shortcuts.title }));
    expect(await screen.findByRole('dialog', { name: en.shortcuts.title })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: en.versionTracker.title })).toBeNull();
  });

  it('shows the keys in the tooltips of the header and of the day buttons', () => {
    render(<App />);
    expect(tab(en.tabs.chart)).toHaveAttribute('aria-keyshortcuts', '2');
    expect(tab(en.tabs.chart)).toHaveAttribute('title', `${en.tabs.chart} (2)`);
    expect(screen.getByRole('button', { name: en.actions.newEntry })).toHaveAttribute(
      'title',
      `${en.actions.newEntry} (N)`
    );
    expect(screen.getByRole('button', { name: en.todayView.prevDay })).toHaveAttribute(
      'aria-keyshortcuts',
      'ArrowLeft'
    );
    press('ArrowLeft');
    const goToToday = screen.getByRole('button', { name: en.todayView.goToToday });
    expect(goToToday).toHaveAttribute('aria-keyshortcuts', 'T');
    expect(goToToday).toHaveAttribute('title', `${en.todayView.goToToday} (T)`);
  });
});
