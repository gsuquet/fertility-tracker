import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a message and hides it after the duration', () => {
    const { result } = renderHook(() => useToast(3000));
    expect(result.current[0]).toBeNull();
    act(() => result.current[1]('Saved'));
    expect(result.current[0]).toBe('Saved');
    act(() => vi.advanceTimersByTime(2999));
    expect(result.current[0]).toBe('Saved');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current[0]).toBeNull();
  });

  it('restarts the duration when a second message comes', () => {
    const { result } = renderHook(() => useToast(3000));
    act(() => result.current[1]('Saved'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current[1]('Deleted'));
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current[0]).toBe('Deleted');
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBeNull();
  });

  it('cancels the timer when it unmounts', () => {
    const { result, unmount } = renderHook(() => useToast(3000));
    act(() => result.current[1]('Saved'));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
