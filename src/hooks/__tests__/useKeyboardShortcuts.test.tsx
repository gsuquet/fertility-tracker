import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShortcutId } from '../../domain/keyboardShortcuts';
import { STORAGE_SHORTCUTS_OFF_KEY } from '../../utils/storageKeys';
import {
  setShortcutsEnabled,
  useShortcut,
  useShortcutHint,
  useShortcutsEnabled,
} from '../useKeyboardShortcuts';

const Shortcut = ({ id, onKey }: { id: ShortcutId; onKey: () => void }) => {
  useShortcut(id, onKey);
  return null;
};

afterEach(() => {
  vi.restoreAllMocks();
  setShortcutsEnabled(true);
});

describe('useShortcut', () => {
  it('calls the handler of the key and stops the default action of the browser', () => {
    const onKey = vi.fn();
    render(<Shortcut id="chart" onKey={onKey} />);
    const event = new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(onKey).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('does nothing for another key, a key without a handler or a handled key', () => {
    const onKey = vi.fn();
    render(<Shortcut id="chart" onKey={onKey} />);
    fireEvent.keyDown(document.body, { key: 'x' });
    fireEvent.keyDown(document.body, { key: '3' });
    const event = new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true });
    event.preventDefault();
    document.body.dispatchEvent(event);
    expect(onKey).not.toHaveBeenCalled();
    // A key without a shortcut keeps its default action
    const other = new KeyboardEvent('keydown', { key: '3', bubbles: true, cancelable: true });
    document.body.dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
  });

  it('does nothing while the focus is in a field', () => {
    const onKey = vi.fn();
    render(
      <>
        <Shortcut id="newEntry" onKey={onKey} />
        <input aria-label="notes" />
      </>
    );
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'n' });
    expect(onKey).not.toHaveBeenCalled();
  });

  it('calls the last handler and removes the listener when the last user unmounts', () => {
    const first = vi.fn();
    const second = vi.fn();
    const one = render(<Shortcut id="today" onKey={first} />);
    const two = render(<Shortcut id="today" onKey={second} />);
    fireEvent.keyDown(document.body, { key: '1' });
    expect(second).toHaveBeenCalledOnce();
    // The first one unmounts, so the second one stays
    one.unmount();
    fireEvent.keyDown(document.body, { key: '1' });
    expect(second).toHaveBeenCalledTimes(2);
    const remove = vi.spyOn(document, 'removeEventListener');
    two.unmount();
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
    fireEvent.keyDown(document.body, { key: '1' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('uses the newest handler of a component', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Shortcut id="help" onKey={first} />);
    rerender(<Shortcut id="help" onKey={second} />);
    fireEvent.keyDown(document.body, { key: '?' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('does nothing while the shortcuts are off, and saves the choice', () => {
    const onKey = vi.fn();
    render(<Shortcut id="goToToday" onKey={onKey} />);
    act(() => setShortcutsEnabled(false));
    expect(localStorage.getItem(STORAGE_SHORTCUTS_OFF_KEY)).toBe('true');
    fireEvent.keyDown(document.body, { key: 't' });
    expect(onKey).not.toHaveBeenCalled();
    act(() => setShortcutsEnabled(true));
    expect(localStorage.getItem(STORAGE_SHORTCUTS_OFF_KEY)).toBe('false');
    fireEvent.keyDown(document.body, { key: 't' });
    expect(onKey).toHaveBeenCalledOnce();
  });
});

describe('useShortcutsEnabled', () => {
  it('is on by default, reads the saved choice and follows a change', () => {
    localStorage.setItem(STORAGE_SHORTCUTS_OFF_KEY, 'true');
    const { result, unmount } = renderHook(() => useShortcutsEnabled());
    expect(result.current).toBe(false);
    act(() => setShortcutsEnabled(true));
    expect(result.current).toBe(true);
    unmount();
  });

  it('keeps the choice in memory when the browser cannot save it', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useShortcutsEnabled());
    act(() => setShortcutsEnabled(false));
    expect(result.current).toBe(false);
    expect(localStorage.getItem(STORAGE_SHORTCUTS_OFF_KEY)).toBeNull();
  });
});

describe('useShortcutHint', () => {
  it('adds the key to the tooltip and aria-keyshortcuts only while the shortcuts are on', () => {
    const { result } = renderHook(() => useShortcutHint());
    expect(result.current('Next Day', 'nextDay')).toEqual({
      title: 'Next Day (→)',
      'aria-keyshortcuts': 'ArrowRight',
    });
    act(() => setShortcutsEnabled(false));
    expect(result.current('Next Day', 'nextDay')).toEqual({ title: 'Next Day' });
  });
});
