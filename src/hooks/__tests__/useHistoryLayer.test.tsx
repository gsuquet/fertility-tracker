import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseTabHash, useHistoryLayer, useHistoryTab } from '../useHistoryLayer';

const depth = () => (window.history.state as { ftLayerDepth?: number } | null)?.ftLayerDepth;

/** Waits for the microtask that makes the history entries match the layers. */
const flush = () => act(async () => {});

/** Counts the entries that the app adds. */
const pushes = () => vi.spyOn(window.history, 'pushState');

// Unmounting the layers of a test goes back in the history: wait until it ends
afterEach(async () => {
  cleanup();
  await flush();
  await new Promise(resolve => setTimeout(resolve, 20));
  vi.restoreAllMocks();
});

/** Presses Back and waits until the app has handled it. */
const back = async () => {
  const popped = new Promise(resolve =>
    window.addEventListener('popstate', resolve, { once: true })
  );
  window.history.back();
  await act(async () => {
    await popped;
  });
};

const Layer = ({ onClose, open = true }: { onClose: () => void; open?: boolean }) => {
  useHistoryLayer(onClose, open);
  return null;
};

describe('parseTabHash', () => {
  it('gives the page of a known hash, else Today', () => {
    expect(parseTabHash('#chart')).toBe('chart');
    expect(parseTabHash('#calendar')).toBe('calendar');
    expect(parseTabHash('#analytics')).toBe('analytics');
    expect(parseTabHash('#today')).toBe('today');
    expect(parseTabHash('')).toBe('today');
    expect(parseTabHash('#unknown')).toBe('today');
    expect(parseTabHash('chart')).toBe('today');
  });
});

describe('useHistoryLayer', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));

  it('adds one entry for an open layer, also in StrictMode', async () => {
    const push = pushes();
    render(
      <StrictMode>
        <Layer onClose={vi.fn()} />
      </StrictMode>
    );
    await flush();
    expect(push).toHaveBeenCalledTimes(1);
    expect(depth()).toBe(1);
  });

  it('adds no entry while the layer is closed', async () => {
    const push = pushes();
    render(<Layer onClose={vi.fn()} open={false} />);
    await flush();
    expect(push).not.toHaveBeenCalled();
  });

  it('closes only the top layer on Back', async () => {
    const closeBottom = vi.fn();
    const closeTop = vi.fn();
    render(
      <>
        <Layer onClose={closeBottom} />
        <Layer onClose={closeTop} />
      </>
    );
    await flush();
    expect(depth()).toBe(2);
    await back();
    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBottom).not.toHaveBeenCalled();
  });

  it('closes the layers one by one with two Back presses', async () => {
    const Stack = () => {
      const [open, setOpen] = useState(2);
      return (
        <>
          {open >= 1 && <Layer onClose={() => setOpen(0)} />}
          {open >= 2 && <Layer onClose={() => setOpen(1)} />}
          <output>{open}</output>
        </>
      );
    };
    const { container } = render(<Stack />);
    await flush();
    await back();
    await flush();
    expect(container.textContent).toBe('1');
    expect(depth()).toBe(1);
    await back();
    await flush();
    expect(container.textContent).toBe('0');
    expect(depth() ?? 0).toBe(0);
  });

  it('removes the entry of a layer that closes in another way', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Layer onClose={onClose} />);
    await flush();
    expect(depth()).toBe(1);
    rerender(<Layer onClose={onClose} open={false} />);
    await waitFor(() => expect(depth() ?? 0).toBe(0));
    await flush();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps one entry when a layer replaces another in the same change', async () => {
    const Swap = ({ second }: { second: boolean }) =>
      second ? <Layer key="b" onClose={vi.fn()} /> : <Layer key="a" onClose={vi.fn()} />;
    const { rerender } = render(<Swap second={false} />);
    await flush();
    const push = pushes();
    const go = vi.spyOn(window.history, 'go');
    rerender(<Swap second />);
    await flush();
    expect(push).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
    expect(depth()).toBe(1);
  });

  it('adds the entry of a new layer only after the Back of a closed layer ends', async () => {
    const Toggle = ({ which }: { which: 'a' | 'none' | 'b' }) =>
      which === 'none' ? null : <Layer key={which} onClose={vi.fn()} />;
    const { rerender } = render(<Toggle which="a" />);
    await flush();
    rerender(<Toggle which="none" />);
    await flush();
    // The Back of the closed layer is pending when the next layer opens
    rerender(<Toggle which="b" />);
    await flush();
    await waitFor(() => expect(depth()).toBe(1));
  });

  it('adds the entry again when the layer stays open after Back', async () => {
    const onClose = vi.fn();
    render(<Layer onClose={onClose} />);
    await flush();
    await back();
    await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(depth()).toBe(1);
  });

  it('goes back past an entry of a layer that is not open', async () => {
    window.history.pushState({ ftLayerDepth: 1 }, '');
    window.history.back();
    await waitFor(() => expect(depth() ?? 0).toBe(0));
    const popped = new Promise(resolve =>
      window.addEventListener('popstate', resolve, { once: true })
    );
    window.history.forward();
    await popped;
    await waitFor(() => expect(depth() ?? 0).toBe(0));
  });
});

describe('useHistoryTab', () => {
  beforeEach(() => window.history.replaceState({ ftLayerDepth: 2 }, '', '/'));
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('starts with no layer entry and keeps an empty hash on Today', () => {
    const { result } = renderHook(() => useHistoryTab('today'));
    expect(result.current[0]).toBe('today');
    expect(depth()).toBe(0);
    expect(window.location.hash).toBe('');
  });

  it('puts the first page in the hash when the hash does not show it', () => {
    const { result } = renderHook(() => useHistoryTab('chart'));
    expect(result.current[0]).toBe('chart');
    expect(window.location.hash).toBe('#chart');
  });

  it('adds an entry with the hash of each new page, and Back opens the previous page', async () => {
    const { result } = renderHook(() => useHistoryTab('today'));
    const push = pushes();
    act(() => result.current[1]('calendar'));
    await flush();
    expect(result.current[0]).toBe('calendar');
    expect(window.location.hash).toBe('#calendar');
    expect(push).toHaveBeenCalledTimes(1);
    await back();
    await flush();
    expect(result.current[0]).toBe('today');
    expect(window.location.hash).toBe('');
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('adds no entry when the page does not change', async () => {
    const { result } = renderHook(() => useHistoryTab('today'));
    const push = pushes();
    act(() => result.current[1]('today'));
    await flush();
    expect(push).not.toHaveBeenCalled();
  });

  it('opens the page of a hash that the user types', async () => {
    const { result } = renderHook(() => useHistoryTab('today'));
    await act(async () => {
      window.location.hash = '#analytics';
      await new Promise(resolve => window.addEventListener('hashchange', resolve, { once: true }));
    });
    expect(result.current[0]).toBe('analytics');
  });

  it('closes the layers of the old page before it adds the entry of the new page', async () => {
    const App = () => {
      const [tab, setTab] = useHistoryTab('today');
      return (
        <>
          <Layer onClose={vi.fn()} />
          <button type="button" onClick={() => setTab('chart')}>
            {tab}
          </button>
        </>
      );
    };
    const { getByRole } = render(<App />);
    await flush();
    expect(depth()).toBe(1);
    const push = pushes();
    act(() => getByRole('button').click());
    await waitFor(() => expect(window.location.hash).toBe('#chart'));
    await flush();
    expect(depth()).toBe(1);
    // The entry of the page, then the entry of the layer that stays open
    expect(push).toHaveBeenCalledTimes(2);
    expect(getByRole('button').textContent).toBe('chart');
  });

  it('does not follow the page in the hash after the app unmounts', async () => {
    const { result, unmount } = renderHook(() => useHistoryTab('today'));
    act(() => result.current[1]('chart'));
    unmount();
    window.history.replaceState(null, '', '/');
    render(<Layer onClose={vi.fn()} />);
    await flush();
    expect(window.location.hash).toBe('');
    expect(depth()).toBe(1);
  });

  it('ignores a hash change that its own Back causes', async () => {
    const { result } = renderHook(() => useHistoryTab('today'));
    act(() => result.current[1]('chart'));
    await flush();
    const Closing = ({ open }: { open: boolean }) => <Layer onClose={vi.fn()} open={open} />;
    const { rerender } = render(<Closing open />);
    await flush();
    rerender(<Closing open={false} />);
    await flush();
    // The Back of the closed layer is pending: a hash change now does not change the page
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => expect(depth() ?? 0).toBe(0));
    expect(result.current[0]).toBe('chart');
  });
});
