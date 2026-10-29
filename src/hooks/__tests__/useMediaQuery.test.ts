import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.mocked(window.matchMedia).mockReset();
  });

  it('follows the changes of the media query and stops at unmount', () => {
    let listener: () => void = () => {};
    const list = {
      matches: false,
      addEventListener: vi.fn((_type: string, callback: () => void) => {
        listener = callback;
      }),
      removeEventListener: vi.fn(),
    };
    vi.mocked(window.matchMedia).mockReturnValue(list as unknown as MediaQueryList);
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    list.matches = true;
    act(() => listener());
    expect(result.current).toBe(true);

    unmount();
    expect(list.removeEventListener).toHaveBeenCalledWith('change', listener);
  });
});
